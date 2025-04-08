# Achievements

Achievements is a Visual Studio Code extension that allows you to track your progress in coding, and earn achievements for completing tasks.

![Extension Webview Illustration](./screenshot.jpg)

## Features

- Track your progress in coding
- Earn achievements for completing tasks
- View your achievements in the **Achievements** panel
- View each achievement's description and requirements
- View your progress towards each achievement
- Track your time spent coding
- Filter achievements by category, progress, and name
- View your profile and completion percentage
- Enable or disable notifications
- Enable or disable any type of listeners for **privacy**

## Extension Commands

Several commands are available to interact with the Achievements extension. You can access these commands through the Command Palette (Ctrl+Shift+P) or by using keybindings.

|Command|Description|
|---|---|
|`achievements.enable`|Enable or Disable the Achievements extension event tracking (requires a restart)|
|`achievements.settings`|Open the Achievements configuration page|
|`achievements.show`|Show the Achievements panel|

## Configuration

The Achievements extension can be configured through the settings. You can access the settings by going to **File > Preferences > Settings** and searching for "Achievements".
You can also access the settings by using the command `achievements.settings`.

|Setting|Description|
|---|---|
|`achievements.enabled`|Enable or disable the Achievements extension event tracking|
|`achievements.notifications`|Enable or disable notifications for achievements|
|`achievements.logDirectory`|Select the directory where the log files will be stored|
|`achievements.logLevel`|Select the log level (info, debug, error)|
|`achievements.username`|Define your username for the Achievements score display|
|`achievements.listeners.debug`|Enable or disable debug listeners|
|`achievements.listeners.git`|Enable or disable git listeners|
|`achievements.listeners.extensions`|Enable or disable extension listeners|
|`achievements.listeners.files`|Enable or disable file listeners|
|`achievements.listeners.tabs`|Enable or disable tab listeners|
|`achievements.listeners.tasks`|Enable or disable task listeners|
|`achievements.listeners.time`|Enable or disable time tracking listeners|
