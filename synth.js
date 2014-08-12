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
        attack: 50,
        decay: 50,
        sustain: 0.7,
        release: 50
    }
};

function createEnvelope(adsr, currentTime) {
    var node = audioCtx.createGain();
    node.gain.setValueAtTime(0.0, currentTime);
    node.gain.linearRampToValueAtTime(1.0, currentTime + adsr.attack / 1000);
    //TODO why not linear?
    node.gain.setTargetAtTime(adsr.sustain, currentTime + (adsr.attack + adsr.decay) / 1000, 0.5);
    return node;
}

//function createEnvelope(adsr) {
//    var node = audioCtx.createScriptProcessor(1024, 1, 1);
//    var processedFrames = 0;
//    function process(event) {
//        inp = event.inputBuffer.getChannelData(0);
//        out = event.outputBuffer.getChannelData(0);
//        var N = out.length;
//        if(processedFrames/audioCtx.sampleRate*1000 < adsr.attack) {
//            for(var i = 0; i < N; i++) {
//                out[i] = inp[i] * Math.min(1, (processedFrames + i)/audioCtx.sampleRate);
//            }
//        } else {
//            for(var j = 0; j < N; j++) {
//                out[j] = inp[j]
//            }
//        }
//        processedFrames += inp.length;
//    }
//    node.onaudioprocess = process;
//    return node;
//}

var playingSounds = {};

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
    this.osc1.start(0);

    if(this.osc2) {
        this.osc2.start();
        outgoing = this.merger;
    }
    this.envelope = createEnvelope(synthesizer.adsr, audioCtx.currentTime);
    outgoing.connect(this.envelope);
    this.envelope.connect(audioCtx.destination);
};

Sound.prototype.stop = function() {
    var now = audioCtx.currentTime;
    this.envelope.gain.cancelScheduledValues(now);
    this.envelope.gain.setTargetAtTime(0.0, now, synthesizer.adsr.release/1000);
    if(this.osc2) {
        this.osc2.stop(synthesizer.adsr.release);
    }
    this.osc1.stop(synthesizer.adsr.release);
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

function logDataChange(name, value) {
    console.log('Setting ' + name + ' to ', value);
}

// Data binding
window.onload = function() {
    document.getElementById('osc1').onchange = function() {
        logDataChange('osc1 waveform', this.value);
        synthesizer.osc1.type = this.value;
    };
    document.getElementById('osc2').onchange = function() {
        logDataChange('osc2 waveform', this.value);
        synthesizer.osc2.type = this.value;
    };
    document.getElementById('osc1_detune').oninput = function() {
        synthesizer.osc1.detune = this.value;
        logDataChange('osc1 detune', this.value);
        for(var key in playingSounds) {
            var sound = playingSounds[key];
            sound.osc1.detune.value = this.value;
        }
    };
    document.getElementById('osc2_detune').oninput = function() {
        synthesizer.osc2.detune = this.value;
        logDataChange('osc2 detune', this.value);
        for(var key in playingSounds) {
            var sound = playingSounds[key];
            if(sound.osc2) {
                sound.osc2.detune.value = this.value;
            }
        }
    };
    document.getElementById('osc_balance').oninput = function() {
        synthesizer.balance = this.value;
        logDataChange('balance', this.value);
        for(var key in playingSounds) {
            var sound = playingSounds[key];
            if(sound.osc2) {
                sound.gain1.gain.value = 1 - this.value;
                sound.gain2.gain.value = this.value;
            }
        }
    };
    document.getElementById('attack').onchange = function() {
        synthesizer.adsr.attack = this.value;
        logDataChange('attack', this.value);
    };
    document.getElementById('decay').onchange = function() {
        synthesizer.adsr.decay = this.value;
        logDataChange('decay', this.value);
    };
    document.getElementById('sustain').onchange = function() {
        synthesizer.adsr.sustain = this.value;
        logDataChange('sustain', this.value);
    };
    document.getElementById('release').onchange = function() {
        synthesizer.adsr.release = this.value;
        logDataChange('release', this.value);
    };
};