FROM node:latest

MAINTAINER Cong Quan <cqshinn92@gmail.com>

ENV HOME /root
RUN MKDIR /root/node
ADD . /root/node

RUN apt-key adv --keyserver pgp.mit.edu --recv D101F7899D41F3C3
RUN echo "deb http://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install yarn

RUN yarn install
RUN npm install -g nodemon

CMD ["npm","start"]