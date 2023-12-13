FROM python as base
WORKDIR /app

COPY requirements.txt /app
RUN pip install -r requirements.txt
RUN apt-get update && apt-get install -y git openssh-client

COPY main.py /app

FROM hugomods/hugo as hugo

FROM base
COPY --from=hugo /usr/bin/hugo /usr/bin/hugo

EXPOSE 5000

CMD ["python", "main.py"]
