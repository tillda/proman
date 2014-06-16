# proman - your Project Manager!

This is basically a 3kb drop-in replacement for the "&" syntax in bash.

It **launches multiple commands in *background*** and **merges their standard output**.

## Example output

![ScreenShot](http://cl.ly/SKyK/1.%20node%20pm.js%20(node)%20(via%20Ember).png)

## Additional features

- Reliable Ctrl+C : it kills all the launched processes
- Visual separators between outputs
- Binary `pm` reads `pm.json` from a working directory
- `pm -p name` launches only process "name"
- `pm -g groupname` launches only processes from group groupname
- `pm -c name` only shows the command

## TODO

- Simple keyboard shortcuts to restart one of the processes
- I have troubles launching livereload this way - don't know why
- Sometimes the sub-processes don't print out full error messages
- Throttle (group) output lines by some time interval (300ms)
- Add "color" option to processes
- Move from pm.JSON to .JS (module)

## Example process definition file

```json
{
    "processes" : [

    {"name": "clj-tdd", "group":"clj",      "exec": "lein",   "args": "with-profile bleeding midje :autotest", "cwd":"editor"},
    {"name": "cljs-build", "group":"clj",   "exec": "lein",   "args": "cljsbuild auto dev", "cwd":"editor"},
    {"name": "cljx","group":"clj",          "exec": "lein",   "args": "cljx auto", "cwd": "editor"},
    {"disabled": true, "name": "livereload","exec": "grunt",  "args": "watch --gruntfile Gruntfile-LiveReload.js", "cwd" : "client"},
    {"name": "devserver", "group":"web",    "exec": "node",   "args": "app.js", "cwd":"devserver"},
    {"name": "grunt",         				"exec": "grunt",  "args": "watch", "cwd" : "client"},
    {"name": "api-server",    				"exec": "npm",    "args": "start", "cwd" : "server"}

    ]
}

```

## Usage

1. Ooops, there is no npm install... shit!
2. Checkout & symlink pm.js to a directory in PATH so it is accessible as an exectuable from anywhere
2. Create `pm.json` file and run `pm` in that directory