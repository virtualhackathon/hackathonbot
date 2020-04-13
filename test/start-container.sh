#!/bin/bash

TESTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

RUNNING=$(docker ps --format='{{.Names}}' \
    | grep ^ircd$)

if [[ "$RUNNING" ]]
then
    docker container stop ircd
    exit 0
fi


EXISTS=$(docker ps -a --format='{{.Names}}' \
    | grep ^ircd$)

if [[ "$EXISTS" ]]
then
    docker container rm ircd
fi

docker run --name ircd \
    -p 6667:6667 \
    -v "$TESTDIR/conf.d":/inspircd/conf.d/ \
    inspircd/inspircd-docker

