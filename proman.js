#!/usr/local/bin/node

var spawn = require('child_process').spawn;
var fs = require('fs');
var program = require('commander');
var path = require('path');
var colors = require('colors');
var keypress = require('keypress');
var tty = require('tty');
var Q = require('q');
var psTree = require('ps-tree');
var _ = require('lodash');

var processes = [];

program
    .usage('name1 name2 ... [options]')
    .option('-i, --info', 'show table of processes and their configurations')
    .option('-c, --cmd', 'output the command(s) only')
    .option('-f, --fail', 'Fail mode: fail if any process fails')
    .version(require('./package.json').version)
    .parse(process.argv);

var promanFileName = './proman.json';

assert(fs.existsSync(promanFileName), "Can't find proman definition file", {lookingFor: promanFileName, currentWorkingDir:process.cwd()});

function parseSubtasks(args) {
    var subtasks = [], i = 0;
    while ((i<args.length) && (args[i].charAt(0) !== "-")) {
        if (subtasks.indexOf(args[i]) === -1) {
            subtasks.push(args[i]);
        }
        i++;        
    }
    return subtasks;
}

function toArray(o) {
    return Array.isArray(o) ? o : [o];
}

function times(ch, n) {
    return (new Array(n+1)).join(ch);
}

function containsAny(haystack, needles) {
    for (var i=0; i<needles.length; i++) {
        if (haystack.indexOf(needles[i]) !== -1) {
            return true;
        }
    }
    return false;
}

var maxLengths = {};

function addLength(name, str) {
    maxLengths[name] = Math.max((str || "").length, (maxLengths[name] || 0));
}

function assert(val, description, obj) {
    if (!val) {
        errorMessage(description, obj);
        if (isSomeProcessRunning()) {
            killProcesses().then(thisProcessExit);
        } else {
            thisProcessExit();
        }
    }
}

var tagsToRun;

var specifiedTags = parseSubtasks(process.argv.slice(2));

var isFailmode = program.fail || false;

if (specifiedTags.length === 0) {
    tagsToRun = true;
} else {
    tagsToRun = specifiedTags;
}

try {
    var fileContent = fs.readFileSync(promanFileName);
    var projectManagerConfig = JSON.parse(fileContent);
} catch (e) {
    assert(false, "Proman definition file must contain valid JSON", e.message);
}

assert(projectManagerConfig.processes && Array.isArray(projectManagerConfig.processes), "Main object from proman.json file must have a `processes` key with an array value");

processes = projectManagerConfig.processes.filter(function(p) {
    if (tagsToRun === true) {
        return true;
    }
    var pTags = [p.name];
    if (p.group) {
        pTags = pTags.concat(toArray(p.group));
    }
    return containsAny(tagsToRun, pTags);
});

assert(processes.length > 0, "No such process(es) to run. Use -i to list available ones.");

processes.forEach(function(process) {
    addLength("name", process.name);
    addLength("args", process.args);
    addLength("cmd", process.cmd);
    addLength("cwd", process.cwd);
    addLength("group", process.group);
});

function addPadding(str, length, ch) {
    str = str || "";
    while (str.length<length) {
        str = str + (ch || " ");
    }
    return str;
}

if (program.info) {
    writeOut(addPadding("Name", maxLengths.name+2).whiteBG.black);
    writeOut("  ".whiteBG.black+addPadding("Group(s)", maxLengths.group+6).whiteBG.black);
    writeOut(addPadding("Working dir.", maxLengths.cwd+3).whiteBG.black);
    writeOut(addPadding("Command", maxLengths.cmd+1).whiteBG.black);
    writeOut(" ".whiteBG.black);
    writeOut(addPadding("Notes", 15).whiteBG.black);
    writeOut("\n");
    processes.forEach(function(p) {
        writeOut(addPadding(p.name, maxLengths.name+2).green);
        writeOut("  "+addPadding(p.group, maxLengths.group+6).grey);
        writeOut(addPadding(p.cwd, maxLengths.cwd+3).grey);
        writeOut(addPadding(p.cmd, maxLengths.cmd+1).white);
        writeOut(" ");
        writeOut(addPadding((p.disabled || (p.enabled === false)) ? "Disabled" : "", 15));
        writeOut("\n");
    });
    process.exit(0);
}

if (program.cmd) {
    var p = processes.forEach(function(process) {
        console.log(process.exec + " " + process.args);
    });
    process.exit(0);
}

processes = processes.filter(function(process) {
    var enabled = process.disabled != true && process.enabled != false;
    if ((process.name == program.process) || (process.name == program.cmd)) {
        enabled = true;
    }
    if (program.cmd || program.process) {
        enabled = true;
    }
    if (!enabled) {
        console.log("Process", process.name, "is not enabled, skipping.");
    }
    return enabled;
});

var
    exiting = false,
    lastEndedWithEnter = true,
    lastProcess = null,
    reEndsWithEnter = /\n$/,
    reBeginsWithEnter = /^\n/;

function stdoutLinesFormatter(str) {
    str = str.replace(/\n/g, "\n");
    return str;
}

var markers = {
    error : "•".red + "  ",
    errorSpace : "•".red + "  "
};

function stderrLinesFormatter(str) {
    str = str.replace(/\n/g, "\n");
    var append = "";
    var marker = "_ERROR_";
    if (/\n\s*/.test(str)) {
        append = "\n";
    }
    var result =  marker + str.replace(/\n\s*$/, "").replace(/^\n/, "").replace(/\n/g, "\n"+"_ERRORSPACE_");    
    return result + append;
}

function isSomeProcessRunning() {
    return processes && !!processes.filter(function(p) { return p && !!p.running; }).length;
}

function startsWithMarker(str) {
    return /\s*_/.test(str);
}

function addEnterBefore(str) {
    return "\n" + str.replace(/^\n/, "");
}

function isWhitespace(str) {
    return !!str.replace(/\s+/g, "");
}

function concatLines(s1, s2) {
    return s1.replace(/\n+$/, "") + "\n\n" + s2.replace(/^\n+/, "") + "\n";
}

function writeOut(str) {
    process.stdout.write(str);
}

function errorMessage(message, obj) {
    writeOut("\n"+(" ERROR ".redBG.white)+ " " + message.red);
    if (obj) {
        writeOut(" " + (" on ".redBG.white) + " " + JSON.stringify(obj).grey);
    }
}

var lastStdType = "stdout";

function shouldRingBell(str, patterns) {
    if (!patterns) {
        return false;
    }
    if (!Array.isArray(patterns)) {
        patterns = [patterns]
    }
    var result = false;
    patterns.forEach(function(pattern) {
        if (str.indexOf(pattern) != -1) {
            result = true;
        }
    });
    return result;
}

function addHeaders(name, output, changed, linesFormatter) {
    var header = "";
    var formattedOutput = linesFormatter(output);
    if (changed) {
        var padding = "";
        var ch = "━";
        var width = 25;
        for (i=name.length; i<maxLengths.name; i++) {
            padding = padding + ch;
        }
        header = "\n" + times(ch, 2).blue + " " + (" " + name + " ").white  + times(ch, maxLengths.name - name.length + width).blue + (reBeginsWithEnter.test(formattedOutput) ? "" : "\n");
        if (startsWithMarker(formattedOutput)) {
            header = header + "\n";
        }
    }
    return header + formattedOutput;
}

function checkCorrectProcessDefinition(spec) {
    assert(spec.name, "Process specification must have a .name", spec);
    assert(spec.cmd, "Process specification must have a .cmd - the command to run", spec);
    assert(!spec.cwd || (spec.cwd && fs.existsSync(spec.cwd)), "Directory '"+spec.cwd+"' does not exist (current wd is '"+process.cwd()+"').", spec);   
}

function runOnExit(spec) {
    var newSpec = {
        cmd: spec.onExit,
        name: spec.name + "-exit",
        cwd: spec.cwd
    };
    processes.push(newSpec);
    run(newSpec);
}

function run(spec) {

    checkCorrectProcessDefinition(spec);

    var prc = spawn("sh", ["-c", spec.cmd], {cwd: spec.cwd});

    spec.running = true;
    spec.process = prc;
    prc.stdout.setEncoding('utf8');

    var errorPatterns = [].concat(spec.errorPatterns || []).concat(projectManagerConfig.errorPatterns);

    function onData(data, linesFormatter, stdType) {
        var str = data.toString();      
        var append = "";
        if (shouldRingBell(str, errorPatterns)) {
            append = '\u0007' + ' ✖ ERROR '.redBG.white;
        }  
        var principalChange = (lastProcess != prc) || (stdType != lastStdType);
        var blankLineAlreadyPresented = isWhitespace(str) || lastEndedWithEnter || reBeginsWithEnter.test(str);
        if (principalChange && blankLineAlreadyPresented) {
            str = addEnterBefore(str);
        }
        var thisOutput = addHeaders(spec.name, str, lastProcess != prc, linesFormatter);
        if (!exiting) {
            if ((stdType != lastStdType) && (stdType != "stdout")) {
                writeOut("\n");
                thisOutput = thisOutput.replace(/^\s*_ERROR_\s*\n/, "");
            }
            thisOutput = thisOutput.replace(/_ERROR_/g, markers.error);
            thisOutput = thisOutput.replace(/_ERRORSPACE_/g, markers.errorSpace);
            if (append) {
                writeOut(concatLines(thisOutput, append))
            } else {
                writeOut(thisOutput);
            }
        }
        lastEndedWithEnter = reEndsWithEnter.test(str);
        lastStdType = stdType;
        lastProcess = prc;
    }

    prc.stdout.on('data', function(data) {
        onData(data, stdoutLinesFormatter, "stdout");
    });

    prc.stderr.on('data', function(data) {
        onData(data, stderrLinesFormatter, "stderr");
    });

    prc.on('close', function(code, signal) {
        if (!exiting) {
            spec.running = false;
            if (code != 0) {
                console.log("Process " + spec.name + " failed with code " + code + " (signal: " + signal + ").");
                if (isFailmode) {
                    errorExitHandler(code);
                }
            } else {
                console.log("Process " + spec.name + " finished.");
                if (spec.onExit) {
                    console.log("->".blue, "Continuing with onExit.".white);
                    runOnExit(spec);    
                }
            }
            if (!isSomeProcessRunning()) {
                writeOut("\nNothing to do.".white);        
                process.exit(0);
            }
        }
    });

    prc.on('error', function(error) {
        console.log(spec.name, "error", error);
    });

    prc.on('disconnect', function(error) {
        console.log(spec.name, "disconnect", error);
    });

}

processes.forEach(function(spec) {
    spec.timeout = setTimeout(function() { run(spec); }, spec.delay || 1);
});

function killProcesses() {
    var later = Q.defer();

    exiting = true;
    var idsToKill = [];

    if (processes && processes.length) {

        writeOut("\nTerminating: ".white);
        processes.forEach(function(spec) {
            if (!spec.running) {
                writeOut((spec.name.grey)+ " ");    
                return;
            }
            clearTimeout(spec.timeout);
            writeOut(spec.name+ " ");        
            if (!spec.process) {
                return;
            }  
            psTree(spec.process.pid, function (err, children) {
                children.forEach(function (p) {
                    idsToKill.push(p.PID); 
                });
                idsToKill.push(spec.process.pid);
            });
        });

        setTimeout(function() {
            idsToKill.forEach(function(id) {
                try {
                    process.kill(id);
                    killed.push(spec.name);
                } catch (e) {
                }        
            });
        }, 500);

        setTimeout(function() {
            idsToKill.forEach(function(id) {
                try {
                    process.kill(id, "SIGKILL");
                    killed.push(spec.name);
                } catch (e) {
                }        
            });
            setTimeout(function() {   
                writeOut("\n" + ("Done.".grey));             
                later.resolve();    
            }, 10);            
        }, 1500);

    }

    return later.promise;
}

function thisProcessExit(code) {
    process.exit(code || 1);
}

function errorExitHandler(code) {
    if (!exiting) {
        writeOut(code ? (("\nExiting with error code "+code+".\n").white) : ("\nExiting.\n").white);
        exiting = true;
        killProcesses().then(function() {
            thisProcessExit(code)
        });
    } else {
        console.log("(Already exiting)");
    }
}

process.on('exit', errorExitHandler);
process.on('SIGINT', errorExitHandler);
process.on('uncaughtException', errorExitHandler);

keypress(process.stdin);

process.stdin.on('keypress', function (ch, key) {
    if (key && key.ctrl && key.name == 'c') {
    	if (!exiting) {
        	errorExitHandler();
        } else {
     		console.log("Warning: forced exit.");   	
        	process.exit(1);
        }
    }
});

if (typeof process.stdin.setRawMode == 'function') {
    process.stdin.setRawMode(true);
} else {
    console.error("Can't set raw mode true.");
}

process.stdin.resume();