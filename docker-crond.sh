#!/bin/sh
# Start the busybox cron daemon alongside nginx. Alpine's logrotate package
# hooks into /etc/periodic/daily, which the default root crontab runs at
# 02:00 — that is what enforces the 14-day log retention.
crond
