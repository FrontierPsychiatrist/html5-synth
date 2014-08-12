/**
 * Created by moritz on 07/08/14.
 */

var audioCtx = new window.AudioContext;

var synthesizer = {
    osc1: {
        type: 'sine',
        detune: 0
    },
    osc2: {
        type: 'off',
        detune: 0
    },
    balance: 0.5,
    adsr: {
        attack: 200,
        decay: 50,
        sustain: 0.7,
        release: 100
    }
};

function createEnvelope(adsr) {
    var node = audioCtx.createScriptProcessor(1024, 1, 1);
    function process(event) {
        inp = event.inputBuffer.getChannelData(0);
        out = event.outputBuffer.getChannelData(0);
        for(var i = 0, N = out.length; i < N; i++) {

                out[i] = inp[i] * 0.7;
//                out[i] = inp[i];
//            }
        }
    }
    node.onaudioprocess = process;
    return node;
}

var playingSounds = {};

/*var lfq = audioCtx.createOscillator();
lfq.type = 'sine';
lfq.frequency.value = 20;
var lfqProcessor = audioCtx.createScriptProcessor(1024, 1, 1);
lfqProcessor.onaudioprocess = function(event) {
    var inp = event.inputBuffer.getChannelData(0);
    console.log(inp);
};
lfq.connect(lfqProcessor);
lfq.start();
lfq.stop(1);
setTimeout(function() {
    lfq.disconnect()
}, 1000);*/
function createOscillator(ctx, config, freq) {
    var osc = ctx.createOscillator();
    osc.type = config.type;
    osc.detune.value = config.detune;
    osc.frequency.value = freq;
    return osc;
}

function mergeTwoChannels(ctx, ch1, ch2) {
    var merger = ctx.createChannelMerger(2);
    ch1.connect(merger);
    ch2.connect(merger);
    return merger;
}

function addGain(ctx, ch, gainValue) {
    var gain = ctx.createGain();
    gain.gain.value = gainValue;
    ch.connect(gain);
    return gain;
}

function Sound(freq, osc1Config, osc2Config, balance) {
    this.osc1 = createOscillator(audioCtx, osc1Config, freq);
    if(osc2Config.type !== 'off') {
        this.gain1 = addGain(audioCtx, this.osc1, 1 - balance);
        this.osc2 = createOscillator(audioCtx, osc2Config, freq);
        this.gain2 = addGain(audioCtx, this.osc2, balance);
        this.merger = mergeTwoChannels(audioCtx, this.gain1, this.gain2);
    }
}

Sound.prototype.start = function() {
    var outgoing = this.osc1;
    this.osc1.start();

    if(this.osc2) {
        this.osc2.start();
        outgoing = this.merger;
    }
    this.envelope = createEnvelope(synthesizer.adsr);
    outgoing.connect(this.envelope);
    this.envelope.connect(audioCtx.destination);
};

Sound.prototype.stop = function() {
    if(this.osc2) {
        this.merger.disconnect();
        this.osc2.stop();
    }
    this.envelope.disconnect();
    this.osc1.stop();
};

var noteKeyMap = {
    81: 440,
    87: 493.88,
    69: 523.25,
    82:  587.33,
    84:  659.25,
    89:  698.46
};

document.onkeydown = function(event) {
    var key = event.keyCode;
    if(noteKeyMap.hasOwnProperty(key) && !playingSounds.hasOwnProperty(key)) {
        var sound = new Sound(noteKeyMap[key], synthesizer.osc1, synthesizer.osc2, synthesizer.balance);
        playingSounds[key] = sound;
        sound.start();
    }
};

document.onkeyup = function(event) {
    var key = event.keyCode;
    if(playingSounds.hasOwnProperty(key)) {
        playingSounds[key].stop();
        delete playingSounds[key];
    }
};

// Data binding
window.onload = function() {
    document.getElementById('osc1').onchange = function() {
        synthesizer.osc1.type = this.value;
    };
    document.getElementById('osc2').onchange = function() {
        synthesizer.osc2.type = this.value;
    };
    document.getElementById('osc1_detune').oninput = function() {
        synthesizer.osc1.detune = this.value;
        for(var key in playingSounds) {
            var sound = playingSounds[key];
            sound.osc1.detune.value = this.value;
        }
    };
    document.getElementById('osc2_detune').oninput = function() {
        synthesizer.osc2.detune = this.value;
        for(var key in playingSounds) {
            var sound = playingSounds[key];
            if(sound.osc2) {
                sound.osc2.detune.value = this.value;
            }
        }
    };
    document.getElementById('osc_balance').oninput = function() {
        synthesizer.balance = this.value;
        for(var key in playingSounds) {
            var sound = playingSounds[key];
            if(sound.osc2) {
                sound.gain1.gain.value = 1 - this.value;
                sound.gain2.gain.value = this.value;
            }
        }
    }
};