"use strict";
/*
 * ANT+ profile: https://www.thisisant.com/developer/ant-plus/device-profiles/#521_tab
 * Spec sheet: https://www.thisisant.com/resources/bicycle-power/
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
var Constants = Ant.Constants;
var Messages = Ant.Messages;
var BicyclePowerSensorState = /** @class */ (function () {
    function BicyclePowerSensorState(deviceID) {
        this.offset = 0;
        this.DeviceID = deviceID;
    }
    return BicyclePowerSensorState;
}());
var BicyclePowerScanState = /** @class */ (function (_super) {
    __extends(BicyclePowerScanState, _super);
    function BicyclePowerScanState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BicyclePowerScanState;
}(BicyclePowerSensorState));
var BicyclePowerSensor = /** @class */ (function (_super) {
    __extends(BicyclePowerSensor, _super);
    function BicyclePowerSensor(stick) {
        var _this = _super.call(this, stick) || this;
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    BicyclePowerSensor.prototype.attach = function (channel, deviceID) {
        _super.prototype.attach.call(this, channel, 'receive', deviceID, BicyclePowerSensor.deviceType, 0, 255, 8182);
        this.state = new BicyclePowerSensorState(deviceID);
    };
    BicyclePowerSensor.prototype.decodeData = function (data) {
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
    BicyclePowerSensor.deviceType = 0x0B;
    return BicyclePowerSensor;
}(Ant.AntPlusSensor));
exports.BicyclePowerSensor = BicyclePowerSensor;
var BicyclePowerScanner = /** @class */ (function (_super) {
    __extends(BicyclePowerScanner, _super);
    function BicyclePowerScanner(stick) {
        var _this = _super.call(this, stick) || this;
        _this.states = {};
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    BicyclePowerScanner.prototype.scan = function () {
        _super.prototype.scan.call(this, 'receive');
    };
    BicyclePowerScanner.prototype.decodeData = function (data) {
        if (data.length <= Messages.BUFFER_INDEX_EXT_MSG_BEGIN || !(data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN) & 0x80)) {
            console.log('wrong message format');
            return;
        }
        var deviceId = data.readUInt16LE(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 1);
        var deviceType = data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 3);
        if (deviceType !== BicyclePowerScanner.deviceType) {
            return;
        }
        if (!this.states[deviceId]) {
            this.states[deviceId] = new BicyclePowerScanState(deviceId);
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
    BicyclePowerScanner.deviceType = 0x0B;
    return BicyclePowerScanner;
}(Ant.AntPlusScanner));
exports.BicyclePowerScanner = BicyclePowerScanner;
function updateState(sensor, state, data) {
    var page = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA);
    switch (page) {
        case 0x01: {
            var calID = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            if (calID === 0x10) {
                var calParam = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
                if (calParam === 0x01) {
                    state.offset = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
                }
            }
            break;
        }
        case 0x10: {
            var pedalPower = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            if (pedalPower !== 0xFF) {
                if (pedalPower & 0x80) {
                    state.PedalPower = pedalPower & 0x7F;
                    state.RightPedalPower = state.PedalPower;
                    state.LeftPedalPower = 100 - state.RightPedalPower;
                }
                else {
                    state.PedalPower = pedalPower & 0x7F;
                    state.RightPedalPower = undefined;
                    state.LeftPedalPower = undefined;
                }
            }
            else {
                state.PedalPower = undefined;
                state.RightPedalPower = undefined;
                state.LeftPedalPower = undefined;
            }
            var cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            if (cadence !== 0xFF) {
                state.Cadence = cadence;
            }
            else {
                state.Cadence = undefined;
            }
            state.AccumulatedPower = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            state.Power = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
            break;
        }
        case 0x20: {
            var oldEventCount = state.EventCount;
            var oldTimeStamp = state.TimeStamp;
            var oldTorqueTicksStamp = state.TorqueTicksStamp;
            var eventCount = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            var slope = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 3);
            var timeStamp = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5);
            var torqueTicksStamp = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (timeStamp !== oldTimeStamp && eventCount !== oldEventCount) {
                state.EventCount = eventCount;
                if (oldEventCount > eventCount) {
                    eventCount += 255;
                }
                state.TimeStamp = timeStamp;
                if (oldTimeStamp > timeStamp) {
                    timeStamp += 65400;
                }
                state.Slope = slope;
                state.TorqueTicksStamp = torqueTicksStamp;
                if (oldTorqueTicksStamp > torqueTicksStamp) {
                    torqueTicksStamp += 65535;
                }
                var elapsedTime = (timeStamp - oldTimeStamp) * 0.0005;
                var torqueTicks = torqueTicksStamp - oldTorqueTicksStamp;
                var cadencePeriod = elapsedTime / (eventCount - oldEventCount); // s
                var cadence = Math.round(60 / cadencePeriod); // rpm
                state.CalculatedCadence = cadence;
                var torqueFrequency = (1 / (elapsedTime / torqueTicks)) - state.offset; // Hz
                var torque = torqueFrequency / (slope / 10); // Nm
                state.CalculatedTorque = torque;
                state.CalculatedPower = torque * cadence * Math.PI / 30; // Watts
            }
            break;
        }
        default:
            return;
    }
    sensor.emit('powerData', state);
}
//# sourceMappingURL=bicycle-power-sensors.js.map