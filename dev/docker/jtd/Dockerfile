FROM node:18.14-alpine3.17

RUN apk add curl

RUN curl https://github.com/jsontypedef/json-typedef-codegen/releases/download/v0.4.1/x86_64-unknown-linux-musl.zip -L -o /tmp/jtd-codegen.zip && \
    unzip /tmp/jtd-codegen.zip && \
    mv jtd-codegen /usr/local/bin/

RUN curl https://github.com/jsontypedef/json-typedef-infer/releases/download/v0.2.1/x86_64-unknown-linux-musl.zip -L -o /tmp/jtd-infer.zip && \
    unzip /tmp/jtd-infer.zip && \
    mv jtd-infer /usr/local/bin/

WORKDIR /jtd