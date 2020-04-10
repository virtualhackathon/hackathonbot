#!/bin/bash

TESTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

BASEDIR="$TESTDIR/.."

EVENT=hackathon0
CHANNEL="#hackathon0"
IRC_URI=127.0.0.1

exec 3>&1

$($BASEDIR/bin/event-daemon \
    --bot-nick "BOT_NICK" \
    --irc-uri "$IRC_URI" \
    --irc-channel "$CHANNEL" \
    --irc-admin-channel "$CHANNEL" \
    --log-level debug >&3)
