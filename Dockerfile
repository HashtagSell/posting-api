FROM hashtagsell/ubuntu-node-hashtagsell:v0.12
MAINTAINER Joshua Thomas <joshua.thomas@hashtagsell.com>

RUN mkdir -p /home/hashtagsell/posting-api
WORKDIR /home/hashtagsell/posting-api
COPY . /home/hashtagsell/posting-api
RUN npm install

EXPOSE 8880
CMD ["supervisor", "server"]
