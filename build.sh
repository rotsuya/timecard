#!/bin/sh
lessc css/animation.less css/animation.css
lessc css/timecard.less css/timecard.css
rm timecard.zip
mkdir packaged_app_workspace
rsync -a --exclude=packaged_app_workspace/ --exclude=.* --exclude=package.* --exclude=src/ --exclude=*.webapp ./ packaged_app_workspace/
cp manifest_for_packaged.webapp packaged_app_workspace/manifest.webapp
cd packaged_app_workspace/
zip -9 -r ../timecard.zip *
cd ..
rm -r -f packaged_app_workspace
