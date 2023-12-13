import logging
from flask import Flask, request
import subprocess
import shutil
import os
import tempfile
from waitress import serve

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

secret_token = open(os.environ['SECRET_TOKEN_PATH'], 'r').read().strip()
ssh_key_path = os.environ['SSH_KEY_PATH']
deploy_path = os.environ['DEPLOY_PATH']
deploy_branch = os.environ['DEPLOY_BRANCH']

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        validate_webhook(request)
    except ValueError as e:
        print(e)
        abort(401)  # Unauthorized

    try:
        data = request.get_json()
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

def validate_webhook(request):
    signature = request.headers.get('X-Hub-Signature-256')

    if not signature:
        raise ValueError("No signature provided")

    hmac_gen = hmac.new(secret_token.encode(), request.data, hashlib.sha256)
    expected_signature = f'sha256={hmac_gen.hexdigest()}'

    if not hmac.compare_digest(expected_signature, signature):
        raise ValueError("Invalid signature")

def clone_and_build(repo_url, tmp_dir):
    try:
        os.environ["GIT_SSH_COMMAND"] = f"ssh -i {ssh_key_path} -o IdentitiesOnly=yes"

        repo_dir = os.path.join(tmp_dir, "repo")
        os.makedirs(repo_dir)

        logging.info("Cloning the repository...")
        subprocess.run(["git", "clone", repo_url, repo_dir], check=True)

        logging.info("Building the Hugo project...")
        subprocess.run(["hugo", "-s", repo_dir], check=True)

        build_dir = os.path.join(repo_dir, "public")
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
