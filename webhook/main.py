import hashlib
import hmac
import json
import logging
import os
import subprocess
import shutil
import tempfile

from flask import Flask, request, abort
from waitress import serve

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

secret_token = open(os.environ['SECRET_TOKEN_PATH'], 'r').read().strip()
ssh_key_secret_path = os.environ['SSH_KEY_PATH']
deploy_path = os.environ['DEPLOY_PATH']
deploy_branch = os.environ['DEPLOY_BRANCH']
resume_theme_url = os.environ['RESUME_THEME_URL']

# this hack is because SSH refuses keys with "too open permissions"
# and docker secrets are mounted read-only
tmpfs_path = os.environ['TMPFS_PATH']
ssh_key_path = os.path.join(tmpfs_path, 'ssh-privkey')
shutil.copyfile(ssh_key_secret_path, ssh_key_path)
os.chmod(ssh_key_path, 0o600)

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():
    signature = request.headers.get('X-Hub-Signature-256')
    raw_data = request.get_data()

    try:
        validate_webhook(raw_data, signature)
    except ValueError as e:
        print(e)
        abort(401)

    try:
        data = json.loads(raw_data)
        if data.get("ref") == f"refs/heads/{deploy_branch}" and data.get("commits"):
            repo_url = data["repository"]["ssh_url"]
            logging.info(f"Received push to {deploy_branch} branch for repo: {repo_url}")
            with tempfile.TemporaryDirectory() as tmp_dir:
                clone_and_build(repo_url, tmp_dir)
        else:
            logging.info("Received irrelevant webhook event.")
    except Exception as e:
        logging.error(f"Error processing webhook: {e}", exc_info=True)

    return "OK", 200

def validate_webhook(raw_data, signature):
    if not signature:
        raise ValueError("No signature provided")

    hmac_gen = hmac.new(secret_token.encode(), raw_data, hashlib.sha256)
    expected_signature = f'sha256={hmac_gen.hexdigest()}'

    if not hmac.compare_digest(expected_signature, signature):
        logging.info(f"Expected signature {expected_signature}, instead received {signature}")
        raise ValueError("Invalid signature")

def clone_and_build(repo_url, tmp_dir):
    try:
        os.environ["GIT_SSH_COMMAND"] = f"ssh -i {ssh_key_path} -o IdentitiesOnly=yes"

        repo_dir = os.path.join(tmp_dir, "repo")
        os.makedirs(repo_dir)

        logging.info("Cloning the repository...")
        subprocess.run(["git", "clone", repo_url, repo_dir], check=True)

        if deploy_branch != "master":
            logging.info(f"Switching to the {deploy_branch} branch...")
            subprocess.run(["git", "checkout", deploy_branch],
                cwd=repo_dir, check=True)

        logging.info("Downloading git submodules...")
        subprocess.run(["git", "submodule", "update", "--init"],
                cwd=repo_dir, check=True)

        logging.info("Building the Hugo project...")
        subprocess.run(["hugo", "-s", repo_dir], check=True)

        build_dir = os.path.join(repo_dir, "public")

        logging.info("Rendering the JSON resume...")
        json_resume_path = os.path.join(repo_dir, "resume.json")
        shutil.copyfile(json_resume_path, os.path.join(build_dir, "resume.json"))
        # we clone the theme every time, in case there is a change pushed
        with tempfile.TemporaryDirectory() as resume_dir:
            subprocess.run(["git", "clone", resume_theme_url, resume_dir], check=True)
            shutil.copyfile(json_resume_path, os.path.join(resume_dir, "resume.json"))
            subprocess.run(["npm", "install"], cwd=resume_dir)
            pdf_resume_path = os.path.join(resume_dir, "resume.pdf")
            html_resume_path = os.path.join(resume_dir, "resume.html")
            subprocess.run(["resume", "export", "--theme", "./", pdf_resume_path],
                cwd=resume_dir, check=True)
            subprocess.run(["resume", "export", "--theme", "./", html_resume_path],
                cwd=resume_dir, check=True)
            shutil.copyfile(pdf_resume_path, os.path.join(build_dir, "resume.pdf"))
            shutil.copyfile(html_resume_path, os.path.join(build_dir, "resume.html"))

        deploy_artifacts(build_dir)
    except subprocess.CalledProcessError as e:
        logging.error(f"Subprocess error during clone/build: {e}", exc_info=True)
    except Exception as e:
        logging.error(f"Error in clone_and_build: {e}", exc_info=True)

def deploy_artifacts(build_dir):
    try:
        logging.info(f"Clearing the target directory: {deploy_path}")

        # do not remove the directory itself as it is a Docker mount
        for root, dirs, files in os.walk(deploy_path):
            for f in files:
                os.unlink(os.path.join(root, f))
            for d in dirs:
                shutil.rmtree(os.path.join(root, d))

        logging.info(f"Copying new files to {deploy_path}")
        shutil.copytree(build_dir, deploy_path, dirs_exist_ok=True)

        set_permissions(deploy_path)
        logging.info(f"Deployment complete!")
    except Exception as e:
        logging.error(f"Error deploying artifacts: {e}", exc_info=True)

def set_permissions(path):
    for root, dirs, files in os.walk(path):
        for d in dirs:
            os.chmod(os.path.join(root, d), 0o755)
        for f in files:
            os.chmod(os.path.join(root, f), 0o755)

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=5000)
