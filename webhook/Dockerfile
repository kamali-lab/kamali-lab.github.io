FROM python as base
WORKDIR /app

COPY requirements.txt /app
RUN pip install -r requirements.txt

# yes, we actually need all of these
# hugo to render the website itself
# node/npm to render JSONResume
# git to clone the repo
# openssh-client because we're using SSH keys to authenticate
# the rest is for puppeteer to work (which is used by JSONResume)
RUN apt-get update \
    && apt-get install -y git openssh-client nodejs npm hugo \
    libgtk-3-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# install resume-cli globally since it'll be called by python
RUN npm install -g resume-cli

# run as non-root for puppeteer to work properly
RUN groupadd -g 1000 user && \
    useradd user -u 1000 -g 1000 -m -s /bin/bash

COPY main.py /app

USER user

# cache github.com's SSH key locally
RUN mkdir -p ~/.ssh && \
    ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts

EXPOSE 5000

CMD ["python", "main.py"]
