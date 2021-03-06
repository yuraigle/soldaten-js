var myName = '';
var myProf = '';
var botovods = [
    'Зурис', 'Делвин', 'Полыхай', 'Умеля', 'Трогвард',
    'Токихаша', 'Бельверус', 'Лотта', 'Минай', 'Черний',
    'Мадэус', 'Магуша'
];

// управление окошками
var wShown = 0;
jmc.showme('ALT+1 - закрыть окна');
jmc.showme('ALT+2 - окно болтовни');
jmc.showme('ALT+3 - окно лута');

function hideAllWindows() {
    for (var i = 0; i < 10; i++) {
        jmc.parse('#wshow ' + i + ' hide');
    }
    wShown = 0;
}

function showWindow(num) {
    if (wShown === num) { return; }
    hideAllWindows();
    jmc.parse('#wshow ' + num + ' show');
    wShown = num;
}

function layoutTalk() {
    jmc.woutput(2, '[' + hhmm() + '] ' + jmc.Event);
}

function layoutLoot() {
    var line = jmc.Event;
    if (line.indexOf(' кун из трупа ') === -1) {
        jmc.woutput(3, '[' + hhmm() + '] ' + line);
    }
}
// \управление окошками

// триги как в ммс
var registeredTriggers = [];

function trig(cb, rx, flags) {
    var active = !flags.match(/^\-/);
    var blocking = !flags.match(/^[^:\d]*f/);
    var colored = !!flags.match(/^[^:\d]*c/);

    var aa1 = flags.match(/:(.+)$/);
    var group = aa1 ? aa1[1] : '';

    var aa2 = flags.match(/^[^:\d]*(\d+)/)
    var priority = aa2 ? aa2[1] : 0;

    registeredTriggers.push({
        cb: cb,
        rx: rx,
        flags: flags,
        active: active,
        blocking: blocking,
        colored: colored,
        group: group,
        priority: priority
    });
}

function enable(group) {
    for (var i = 0; i < registeredTriggers.length; i++) {
        if (registeredTriggers[i].group === group) {
            registeredTriggers[i].active = enable;
        }
    }
}

function disable(group) {
    for (var i = 0; i < registeredTriggers.length; i++) {
        if (registeredTriggers[i].group === group) {
            registeredTriggers[i].active = false;
        }
    }
}

jmc.RegisterHandler('Incoming', 'onIncoming()');

function onIncoming() {
    var line = jmc.Event;
    var line1 = line.replace(/\x1B\[[01];\d{2}m/g, '');

    for (var i = 0; i < registeredTriggers.length; i++) {
        var trg = registeredTriggers[i];
        if (!trg.active) {
            continue;
        }

        var aa = trg.colored ? line1.match(trg.rx) : line.match(trg.rx);
        if (aa) {
            trg.cb(aa);
            if (trg.blocking) {
                break;
            }
        }
    }
}

jmc.RegisterHandler('Load', 'onLoad()');

function onLoad() {
    registeredTriggers = registeredTriggers.sort(function (a, b) {
        return a.priority - b.priority;
    });

    updateMe();
    myName = '';
    myProf = '';
    jmc.parse('#read soldaten/common.set');
}
// \триги как в ммс

jmc.RegisterHandler('Prompt', 'onPrompt()');

function onPrompt() {
    var lines = jmc.Event.replace(/\x1B\[\d;\d{2}m/g, '').split(/\r?\n/);
    var promptLine = lines[lines.length - 1];

    if (promptLine.substring(promptLine.length - 2) !== '> ') {
        return; // неправильный промт
    }

    onPromptScore();
    onPromptRage(promptLine);
    onPromptKick(promptLine);
    onPromptDrunk(lines, promptLine);
    onPromptAssist(lines, promptLine);
    onPromptAffects(promptLine);
}

// узнаю, кто я по профе
var lastScoreTs = 0;
function onPromptScore() {
    if ((!myName || !myProf) && now() - lastScoreTs > 4) {
        lastScoreTs = now();
        jmc.parse('score');
    }
}

trig(function (aa) {
    var needSetup = !myProf || !myName;

    myName = aa[1];
    myProf = aa[2];
    myName = nameFromTitles(myName);

    if (needSetup) {
        setup(myName, myProf);
    }
}, /^Вы (.+) \(Русич, .+, ([а-я]+) (\d+) уровня\)\.$/, 'f10000:WHOAMI');
// \узнаю, кто я по профе

function setup(name, prof) {
    jmc.setVar('MYNAME', name);

    var setFile = '';
    if (prof === 'витязь') { setFile = 'vityaz.set' }
    if (prof === 'кузнец') { setFile = 'kuznec.set' }
    if (prof === 'богатырь') { setFile = 'bogatir.set' }
    if (prof === 'охотник') { setFile = 'ohotnik.set' }

    if (setFile) {
        jmc.parse('#read soldaten/' + setFile);
    }
}

// иногда жму "афф"
var lastFightPrompt = 0;
var lastAffectsTs = 0;
function onPromptAffects(promptLine) {
    var ts = now();
    var iFight = promptLine.indexOf(']') !== -1 ? 1 : 0;
    if (iFight) {
        lastFightPrompt = ts;
    }

    if (ts - lastFightPrompt < 5) {
        return; // только что была драка, не надо лишних команд
    } else if (ts - lastFightPrompt > 900) {
        return; // давно стоим, зонинг кончился
    }

    if (ts - lastAffectsTs > 60) {
        lastAffectsTs = ts;
        if (Math.random() > 0.5) {
            jmc.parse('афф');
        }
    }
}
