# proman - your Project Manager!

This is basically a 3kb drop-in replacement for the "&" bash syntax :-).

It **launches multiple commands in *background*** from a fancy definition file `proman.json` and **merges their standard output(s)**.

## Features

- **Simply launch multiple background servers, builders, watchers etc. with one command**
- Visual separators between outputs
![Screenshot](http://cl.ly/image/1j3M3a0e2R20/Ember%20Library%20Mediator.png)
- Reliable Ctrl+C : it kills all the launched processes
![Screenshot](http://f.cl.ly/items/1U213y2T462C3S242k23/Ember%20Library%20Mediator.png)
- cmd-line utility `proman` reads `proman.json` from current directory
- User-defined "error" strings in output trigger bell ring and a big "ERROR" bar
![Screenshot](http://cl.ly/image/1W0m1k3K2q0b/Ember.png)
- all `stderr` output is marked with red dot
![Screenshot](http://cl.ly/image/3Y2s2D3C2U0q/Ember%20Library%20Mediator.png)

## Example output

![ScreenShot](http://cl.ly/SKyK/1.%20node%20pm.js%20(node)%20(via%20Ember).png)

## Install

`npm install -g proman`

## Run

- Create `proman.json` in your project directory. Use syntax specified below.
- Run `proman`

## Command-line syntax

- `proman` launches all processes specified in `proman.json`
- `proman -p name` launches only process "name"
- `proman -g groupname` launches only processes from group groupname
- `proman -c name` only shows the command
- `proman -i` shows table of all specified processes
	![Screenshot](http://cl.ly/image/18141J2B0U0M/Ember.png)

## Example process definition file

```json
{
    "processes" : [
        {   "name": "clj-tdd",
            "group":"clj",
            "cwd":"editor",
            "cmd": "lein midje :autotest",
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

Both individual processes and the main definition object can contain a `errorPatterns` key containing a list of strings. If any of this strings is found in the output a big ERROR bar is displayed and the system bell rings. This is (also) intended to help with TDD.

## TODO

- Simple keyboard shortcuts to restart one or more of the processes
- Throttle (group) output lines by some time interval (300ms)
- Add "color" option to processes
