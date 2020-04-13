#!/bin/bash

SCRIPTSDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"
BASEDIR="$SCRIPTSDIR/.."

$BASEDIR/bin/event-daemon \
    --bot-nick BOT_NICK \
    --irc.uri irc.imperialfamily.com \
    --irc-channel '#hackathon' \
    --irc-admin-channel '#hackathon-admin' \
    --log-level debug \
    --irc-port 6667
