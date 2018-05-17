"use strict";
/*
 * ANT+ profile: https://www.thisisant.com/developer/ant-plus/device-profiles/#523_tab
 * Spec sheet: https://www.thisisant.com/resources/bicycle-speed-and-cadence/
 */
var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
Object.defineProperty(exports, "__esModule", { value: true });
var Ant = require("./ant");
var Messages = Ant.Messages;
var Constants = Ant.Constants;
var SpeedCadenceSensorState = /** @class */ (function () {
    function SpeedCadenceSensorState(deviceID) {
        this.DeviceID = deviceID;
    }
    return SpeedCadenceSensorState;
}());
var SpeedCadenceScanState = /** @class */ (function (_super) {
    __extends(SpeedCadenceScanState, _super);
    function SpeedCadenceScanState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SpeedCadenceScanState;
}(SpeedCadenceSensorState));
var SpeedCadenceSensor = /** @class */ (function (_super) {
    __extends(SpeedCadenceSensor, _super);
    function SpeedCadenceSensor(stick) {
        var _this = _super.call(this, stick) || this;
        _this.wheelCircumference = 2.118; //This is my 700c wheel, just using as default
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    SpeedCadenceSensor.prototype.setWheelCircumference = function (wheelCircumference) {
        this.wheelCircumference = wheelCircumference;
    };
    SpeedCadenceSensor.prototype.attach = function (channel, deviceID) {
        //console.log("ATTACH SENSOR",channel, 'receive', deviceID, SpeedCadenceSensor.deviceType, 0, 255, 8086);
        _super.prototype.attach.call(this, channel, 'receive', deviceID, SpeedCadenceSensor.deviceType, 0, 255, 8086);
        this.state = new SpeedCadenceSensorState(deviceID);
    };
    SpeedCadenceSensor.prototype.decodeData = function (data) {
        //console.log(data);
        if (data.readUInt8(Messages.BUFFER_INDEX_CHANNEL_NUM) !== this.channel) {
            return;
        }
        switch (data.readUInt8(Messages.BUFFER_INDEX_MSG_TYPE)) {
            case Constants.MESSAGE_CHANNEL_BROADCAST_DATA:
            case Constants.MESSAGE_CHANNEL_ACKNOWLEDGED_DATA:
            case Constants.MESSAGE_CHANNEL_BURST_DATA:
                if (this.deviceID === 0) {
                    this.write(Messages.requestMessage(this.channel, Constants.MESSAGE_CHANNEL_ID));
                }
                updateState(this, this.state, data);
                break;
            case Constants.MESSAGE_CHANNEL_ID:
                this.deviceID = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA);
                this.transmissionType = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
                this.state.DeviceID = this.deviceID;
                break;
            default:
                break;
        }
    };
    SpeedCadenceSensor.deviceType = 0x79;
    return SpeedCadenceSensor;
}(Ant.AntPlusSensor));
exports.SpeedCadenceSensor = SpeedCadenceSensor;
var SpeedCadenceScanner = /** @class */ (function (_super) {
    __extends(SpeedCadenceScanner, _super);
    function SpeedCadenceScanner(stick) {
        var _this = _super.call(this, stick) || this;
        _this.wheelCircumference = 2.118; //This is my 700c wheel, just using as default
        _this.states = {};
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    SpeedCadenceScanner.prototype.setWheelCircumference = function (wheelCircumference) {
        this.wheelCircumference = wheelCircumference;
    };
    SpeedCadenceScanner.prototype.scan = function () {
        _super.prototype.scan.call(this, 'receive');
    };
    SpeedCadenceScanner.prototype.decodeData = function (data) {
        if (data.length <= (Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 3) || !(data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN) & 0x80)) {
            console.log('wrong message format');
            return;
        }
        var deviceId = data.readUInt16LE(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 1);
        var deviceType = data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 3);
        if (deviceType !== SpeedCadenceScanner.deviceType) {
            return;
        }
        if (!this.states[deviceId]) {
            this.states[deviceId] = new SpeedCadenceScanState(deviceId);
        }
        if (data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN) & 0x40) {
            if (data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 5) === 0x20) {
                this.states[deviceId].Rssi = data.readInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 6);
                this.states[deviceId].Threshold = data.readInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 7);
            }
        }
        switch (data.readUInt8(Messages.BUFFER_INDEX_MSG_TYPE)) {
            case Constants.MESSAGE_CHANNEL_BROADCAST_DATA:
            case Constants.MESSAGE_CHANNEL_ACKNOWLEDGED_DATA:
            case Constants.MESSAGE_CHANNEL_BURST_DATA:
                updateState(this, this.states[deviceId], data);
                break;
            default:
                break;
        }
    };
    SpeedCadenceScanner.deviceType = 0x79;
    return SpeedCadenceScanner;
}(Ant.AntPlusScanner));
exports.SpeedCadenceScanner = SpeedCadenceScanner;

var CadenceSensor = /** @class */ (function (_super) {
    __extends(CadenceSensor, _super);
    function CadenceSensor(stick) {
        var _this = _super.call(this, stick) || this;
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    CadenceSensor.prototype.attach = function (channel, deviceID) {
        //console.log("ATTACH SENSOR",channel, 'receive', deviceID, CadenceSensor.deviceType, 0, 255, 8086);
        _super.prototype.attach.call(this, channel, 'receive', deviceID, CadenceSensor.deviceType, 0, 255, 8102);
        this.state = new SpeedCadenceSensorState(deviceID);
    };
    CadenceSensor.prototype.decodeData = function (data) {
        if (data.readUInt8(Messages.BUFFER_INDEX_CHANNEL_NUM) !== this.channel) {
            return;
        }
        switch (data.readUInt8(Messages.BUFFER_INDEX_MSG_TYPE)) {
            case Constants.MESSAGE_CHANNEL_BROADCAST_DATA:
            case Constants.MESSAGE_CHANNEL_ACKNOWLEDGED_DATA:
            case Constants.MESSAGE_CHANNEL_BURST_DATA:
                if (this.deviceID === 0) {
                    this.write(Messages.requestMessage(this.channel, Constants.MESSAGE_CHANNEL_ID));
                }
                updateCadenceState(this, this.state, data);
                break;
            case Constants.MESSAGE_CHANNEL_ID:
                this.deviceID = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA);
                this.transmissionType = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
                this.state.DeviceID = this.deviceID;
                break;
            default:
                break;
        }
    };
    CadenceSensor.deviceType = 122;
    return CadenceSensor;
}(Ant.AntPlusSensor));


var SpeedSensor = /** @class */ (function (_super) {
    __extends(SpeedSensor, _super);
    function SpeedSensor(stick) {
        var _this = _super.call(this, stick) || this;
        _this.wheelCircumference = 2.118; //This is my 700c wheel, just using as default
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    SpeedSensor.prototype.setWheelCircumference = function (wheelCircumference) {
        this.wheelCircumference = wheelCircumference;
    };
    SpeedSensor.prototype.attach = function (channel, deviceID) {
        //console.log("ATTACH SENSOR",channel, 'receive', deviceID, SpeedSensor.deviceType, 0, 255, 8086);
        _super.prototype.attach.call(this, channel, 'receive', deviceID, SpeedSensor.deviceType, 0, 255, 8102);
        this.state = new SpeedCadenceSensorState(deviceID);
    };
    SpeedSensor.prototype.decodeData = function (data) {
        //console.log(data);
        if (data.readUInt8(Messages.BUFFER_INDEX_CHANNEL_NUM) !== this.channel) {
            return;
        }
        switch (data.readUInt8(Messages.BUFFER_INDEX_MSG_TYPE)) {
            case Constants.MESSAGE_CHANNEL_BROADCAST_DATA:
            case Constants.MESSAGE_CHANNEL_ACKNOWLEDGED_DATA:
            case Constants.MESSAGE_CHANNEL_BURST_DATA:
                if (this.deviceID === 0) {
                    this.write(Messages.requestMessage(this.channel, Constants.MESSAGE_CHANNEL_ID));
                }
                updateSpeedState(this, this.state, data);
                break;
            case Constants.MESSAGE_CHANNEL_ID:
                this.deviceID = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA);
                this.transmissionType = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
                this.state.DeviceID = this.deviceID;
                break;
            default:
                break;
        }
    };
    SpeedSensor.deviceType = 123
    return SpeedSensor;
}(Ant.AntPlusSensor));
exports.SpeedSensor = SpeedSensor;
exports.CadenceSensor = CadenceSensor;

function updateSpeedState(sensor, state, data) {
    var oldSpeedTime = state.SpeedEventTime;
    var oldSpeedCount = state.CumulativeSpeedRevolutionCount;
    var speedEventTime = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
    var speedRevolutionCount = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
    speedEventTime |= data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 5) << 8;
    speedRevolutionCount|=data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7) << 8;
    //if (speedEventTime !== oldSpeedTime) {
    state.SpeedEventTime = speedEventTime;
    state.CumulativeSpeedRevolutionCount = speedRevolutionCount;
    if (oldSpeedTime > speedEventTime) {
        speedEventTime += (1024 * 64);
    }
    var distance = sensor.wheelCircumference * (speedRevolutionCount - oldSpeedCount);
    state.CalculatedDistance = distance;
    //speed in m/sec
    var speed = (distance * 1024) / (speedEventTime - oldSpeedTime);
    //console.log(speed);
    if (!isNaN(speed)) {
        state.CalculatedSpeed = speed;
        sensor.emit('speedData', state);
    }
    else{
        state.CalculatedSpeed = 0;
        sensor.emit('speedData', state);
    }
    //}
}
function updateState(sensor, state, data) {
    //get old state for calculating cumulative values
    var oldCadenceTime = state.CadenceEventTime;
    var oldCadenceCount = state.CumulativeCadenceRevolutionCount;
    var oldSpeedTime = state.SpeedEventTime;
    var oldSpeedCount = state.CumulativeSpeedRevolutionCount;
    var cadenceTime = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 4);//data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA);
    var cadenceCount = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
    var speedEventTime = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
    var speedRevolutionCount = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
    if (cadenceTime !== oldCadenceTime) {
        state.CadenceEventTime = cadenceTime;
        state.CumulativeCadenceRevolutionCount = cadenceCount;
        if (oldCadenceTime > cadenceTime) {
            cadenceTime += (1024 * 64);
        }
        let diffCount = cadenceCount - oldCadenceCount;
        let diffTime = cadenceTime - oldCadenceTime;
        let cadence = 60 * diffCount / (diffTime / 1024);
        //var cadence = ((60 * (cadenceCount - oldCadenceCount) * 1024) / (cadenceTime - oldCadenceTime));
        if (!isNaN(cadence)) {
            state.CalculatedCadence = cadence;
            sensor.emit('cadenceData', state);
        }
    }
    if (speedEventTime !== oldSpeedTime) {
        state.SpeedEventTime = speedEventTime;
        state.CumulativeSpeedRevolutionCount = speedRevolutionCount;
        if (oldSpeedTime > speedEventTime) {
            speedEventTime += (1024 * 64);
        }
        var distance = sensor.wheelCircumference * (speedRevolutionCount - oldSpeedCount);
        state.CalculatedDistance = distance;
        //speed in m/sec
        var speed = (distance * 1024) / (speedEventTime - oldSpeedTime);
        if (!isNaN(speed)) {
            state.CalculatedSpeed = speed;
            sensor.emit('speedData', state);
        }
    }
}
function updateCadenceState(sensor, state, data) {
    let cadenceTime = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 4);
    let cadenceCount = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
    cadenceTime |= data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 5) << 8;
    cadenceCount |= data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7) << 8;
    state.sensor=sensor;
    if (state.oldCadenceCount != null) {
        var rpm=0;
        var time=cadenceTime-state.oldCadenceTime;
        var revs=cadenceCount-state.oldCadenceCount;
        if(time){
            rpm=1024*60*revs/time;
            state.oldCadenceCount=rpm;
            state.oldCadenceTime=cadenceTime;
            state.CalculatedCadence=rpm;
            if(rpm>0)
                sensor.emit('cadenceData', state);
            if(state.tm)
                clearTimeout(state.tm);
            state.tm=setTimeout(()=>{
                    sensor.emit('cadenceData', {"CalculatedCadence":0});
        },2000)
    }
}
state.oldCadenceCount = cadenceCount;
state.oldCadenceTime = cadenceTime;
}
//# sourceMappingURL=speed-cadence-sensors.js.map