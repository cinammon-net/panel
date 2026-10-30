FROM eclipse-temurin:25-jre
ENV HOME=/home/container USER=container
WORKDIR /home/container
COPY entrypoint.sh /entrypoint.sh
RUN chmod 0555 /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
