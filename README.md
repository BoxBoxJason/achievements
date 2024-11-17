# Achievements

Achievements is a Visual Studio Code extension that allows you to track your progress in coding, and earn achievements for completing tasks.

## Features

- Track your progress in coding
- Earn achievements for completing tasks
- View your achievements in the **Achievements** panel
- View each achievement's description and requirements
- View your progress towards each achievement

## Extension Commands

### Configuration commands
- `achievements.enable`: Enables the Achievements extension.
- `achievements.disable`: Disables the Achievements extension.
- `achievements.configuration`: Opens the Achievements configuration page.
- `achievements.notifications`: Enables or disables notifications for achievements.

### Achievement commands
- `achievements.show`: Opens the Achievements panel.

## Release Notes

### [0.0.1] | 2024-11-?? - Initial release

Initial release of Achievements

#### Added
- Database
    - Database model for achievements
    - Database model for progressions
    - Database model for requirements
    - Database model for database schema
    - Migration manager for database schema
    - Initial achievements populated in database
- Over 1000 achievements
    - Git related
    - Code related
    - Debugging related
    - Testing related
    - Refactoring related
    - Commenting related
    - File related
    - More...
- Achievements panel
    - View achievements
    - View progress towards achievements
    - View achievement descriptions
    - Filter achievements by category
    - Filter achievements by progress
    - Filter achievements by name
- Configuration
    - Enable / disable extension
    - Enable / disable notifications
    - Select log level
    - Select log directory

## Known Issues

### Slow boot time
The extension takes around 7 seconds to boot up, which might be considered slow. It is currently required because it checks for the database schema / default achievements at boot. Unfortunately, because better-sqlite3 does not support asynchronous operations, the only way to speed up the boot time would be to switch to a different database library.
