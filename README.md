# proman - your Project Manager!

This is basically a 3kb drop-in replacement for the "&" syntax in bash :-).

It **launches multiple commands in *background*** and **merges their standard output**.

## Example output

![ScreenShot](http://cl.ly/SKyK/1.%20node%20pm.js%20(node)%20(via%20Ember).png)

## Install

`npm install -g proman`

## Features

- Visual separators between outputs
![Screenshot](http://cl.ly/image/1j3M3a0e2R20/Ember%20Library%20Mediator.png)
- Reliable Ctrl+C : it kills all the launched processes
![Screenshot](http://f.cl.ly/items/1U213y2T462C3S242k23/Ember%20Library%20Mediator.png)
- Binary `proman` reads `proman.json` from a working directory
- User-defined "error" strings in output trigger bell ring and a big "ERROR" bar
![Screenshot](http://cl.ly/image/1W0m1k3K2q0b/Ember.png)
- `stderr` output is marked with red dot
![Screenshot](http://cl.ly/image/3Y2s2D3C2U0q/Ember%20Library%20Mediator.png)

## Command-line syntax

- `proman` launches all processes specified in `proman.json`
- `proman -p name` launches only process "name"
- `proman -g groupname` launches only processes from group groupname
- `proman -c name` only shows the command
- `proman -i` shows table of all specified processes

## Example process definition file

```json
{
    "processes" : [
        {   "name": "clj-tdd",
            "group":"clj",
            "cwd":"editor",
            "cmd": "lein midje :autotest"
            "errorPatterns" : ["failed"]
        }, {
            "name": "livereload",
            "cwd" : "client",
            "delay" : 5000,
            "group" : "web",
            "cmd": "grunt watch --gruntfile Gruntfile-LiveReload.js"
        }, {
            "name": "devserver",
            "group": "web",
            "cwd":"devserver",
            "cmd": "node node_modules/gulp/bin/gulp.js"
        }, {
            "name": "staticserver",
            "group": "web",
            "cwd" : "staticserver",
            "cmd": "nodemon -w . -e js -- staticserver.js -p 6400 -e development -s ../client/build"
        }
    ],

    "errorPatterns" : ["Error:"]

}
```
## Process definition syntax

- **.name** (string) - required -  this is how processes are referred to in proman
- **.cmd** (string) - required - the command to run
- **.group** (string) - *optional* - enables launching all processes in a group by one command
- **.cwd** (string) - *optional* - if present changes working directory of a to-be launched process to this value
- **.delay** (number - miliseconds) - *optional* - if present delays launching of the process by this time in ms

## Error patterns

*Beta - work in progress!*

Both individual processes and the main definition object can contain a `errorPatterns` key containing a list of strings. If any of this strings is found in the output a big ERROR bar is displayed and the system bell rings.

## TODO

- Simple keyboard shortcuts to restart one of the processes
- Throttle (group) output lines by some time interval (300ms)
- Add "color" option to processes
- Move from pm.JSON to .JS (module)