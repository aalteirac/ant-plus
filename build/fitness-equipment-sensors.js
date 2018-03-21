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
var FitnessEquipmentSensorState = /** @class */ (function () {
    function FitnessEquipmentSensorState(deviceID) {
        this.PairedDevices = [];
        this.DeviceID = deviceID;
    }
    return FitnessEquipmentSensorState;
}());
var FitnessEquipmentScanState = /** @class */ (function (_super) {
    __extends(FitnessEquipmentScanState, _super);
    function FitnessEquipmentScanState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FitnessEquipmentScanState;
}(FitnessEquipmentSensorState));
var FitnessEquipmentSensor = /** @class */ (function (_super) {
    __extends(FitnessEquipmentSensor, _super);
    function FitnessEquipmentSensor(stick) {
        var _this = _super.call(this, stick) || this;
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    FitnessEquipmentSensor.prototype.attach = function (channel, deviceID) {
        _super.prototype.attach.call(this, channel, 'receive', deviceID, FitnessEquipmentSensor.deviceType, 0, 255, 8192);
        this.state = new FitnessEquipmentSensorState(deviceID);
    };
    FitnessEquipmentSensor.prototype.decodeData = function (data) {
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
    FitnessEquipmentSensor.deviceType = 0x11;
    return FitnessEquipmentSensor;
}(Ant.AntPlusSensor));
exports.FitnessEquipmentSensor = FitnessEquipmentSensor;
var FitnessEquipmentScanner = /** @class */ (function (_super) {
    __extends(FitnessEquipmentScanner, _super);
    function FitnessEquipmentScanner(stick) {
        var _this = _super.call(this, stick) || this;
        _this.states = {};
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    FitnessEquipmentScanner.prototype.scan = function () {
        _super.prototype.scan.call(this, 'receive');
    };
    FitnessEquipmentScanner.prototype.decodeData = function (data) {
        if (data.length <= Messages.BUFFER_INDEX_EXT_MSG_BEGIN || !(data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN) & 0x80)) {
            console.log('wrong message format');
            return;
        }
        var deviceId = data.readUInt16LE(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 1);
        var deviceType = data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 3);
        if (deviceType !== FitnessEquipmentScanner.deviceType) {
            return;
        }
        if (!this.states[deviceId]) {
            this.states[deviceId] = new FitnessEquipmentScanState(deviceId);
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
    FitnessEquipmentScanner.deviceType = 0x11;
    return FitnessEquipmentScanner;
}(Ant.AntPlusScanner));
exports.FitnessEquipmentScanner = FitnessEquipmentScanner;
function resetState(state) {
    delete state.ElapsedTime;
    delete state.Distance;
    delete state.RealSpeed;
    delete state.VirtualSpeed;
    delete state.HeartRate;
    delete state.HeartRateSource;
    delete state.CycleLength;
    delete state.Incline;
    delete state.Resistance;
    delete state.METs;
    delete state.CaloricBurnRate;
    delete state.Calories;
    delete state._EventCount0x19;
    delete state.Cadence;
    delete state.AccumulatedPower;
    delete state.InstantaneousPower;
    delete state.AveragePower;
    delete state.TrainerStatus;
    delete state.TargetStatus;
}
function updateState(sensor, state, data) {
    var page = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA);
    switch (page) {
        case 0x01: {
            var temperature = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            if (temperature !== 0xFF) {
                state.Temperature = -25 + temperature * 0.5;
            }
            var calBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            if (calBF & 0x40) {
                state.ZeroOffset = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            }
            if (calBF & 0x80) {
                state.SpinDownTime = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
            }
            break;
        }
        case 0x10: {
            var equipmentTypeBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            switch (equipmentTypeBF & 0x1F) {
                case 19:
                    state.EquipmentType = 'Treadmill';
                    break;
                case 20:
                    state.EquipmentType = 'Elliptical';
                    break;
                case 21:
                    state.EquipmentType = 'StationaryBike';
                    break;
                case 22:
                    state.EquipmentType = 'Rower';
                    break;
                case 23:
                    state.EquipmentType = 'Climber';
                    break;
                case 24:
                    state.EquipmentType = 'NordicSkier';
                    break;
                case 25:
                    state.EquipmentType = 'Trainer';
                    break;
                default:
                    state.EquipmentType = 'General';
                    break;
            }
            var elapsedTime = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            var distance = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            var speed = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            var heartRate = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            var capStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (heartRate !== 0xFF) {
                switch (capStateBF & 0x03) {
                    case 3: {
                        state.HeartRate = heartRate;
                        state.HeartRateSource = 'HandContact';
                        break;
                    }
                    case 2: {
                        state.HeartRate = heartRate;
                        state.HeartRateSource = 'EM';
                        break;
                    }
                    case 1: {
                        state.HeartRate = heartRate;
                        state.HeartRateSource = 'ANT+';
                        break;
                    }
                    default: {
                        delete state.HeartRate;
                        delete state.HeartRateSource;
                        break;
                    }
                }
            }
            elapsedTime /= 4;
            var oldElapsedTime = (state.ElapsedTime || 0) % 64;
            if (elapsedTime !== oldElapsedTime) {
                if (oldElapsedTime > elapsedTime) {
                    elapsedTime += 64;
                }
            }
            state.ElapsedTime = (state.ElapsedTime || 0) + elapsedTime - oldElapsedTime;
            if (capStateBF & 0x04) {
                var oldDistance = (state.Distance || 0) % 256;
                if (distance !== oldDistance) {
                    if (oldDistance > distance) {
                        distance += 256;
                    }
                }
                state.Distance = (state.Distance || 0) + distance - oldDistance;
            }
            else {
                delete state.Distance;
            }
            if (capStateBF & 0x08) {
                state.VirtualSpeed = speed / 1000;
                delete state.RealSpeed;
            }
            else {
                delete state.VirtualSpeed;
                state.RealSpeed = speed / 1000;
            }
            switch ((capStateBF & 0x70) >> 4) {
                case 1:
                    state.State = 'OFF';
                    break;
                case 2:
                    state.State = 'READY';
                    resetState(state);
                    break;
                case 3:
                    state.State = 'IN_USE';
                    break;
                case 4:
                    state.State = 'FINISHED';
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (capStateBF & 0x80) {
                // lap
            }
            break;
        }
        case 0x11: {
            var cycleLen = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            var incline = data.readInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            var resistance = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            var capStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (cycleLen !== 0xFF) {
                state.CycleLength = cycleLen / 100;
            }
            if (incline >= -10000 && incline <= 10000) {
                state.Incline = incline / 100;
            }
            if (resistance !== 0xFF) {
                state.Resistance = resistance;
            }
            switch ((capStateBF & 0x70) >> 4) {
                case 1:
                    state.State = 'OFF';
                    break;
                case 2:
                    state.State = 'READY';
                    resetState(state);
                    break;
                case 3:
                    state.State = 'IN_USE';
                    break;
                case 4:
                    state.State = 'FINISHED';
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (capStateBF & 0x80) {
                // lap
            }
            break;
        }
        case 0x12: {
            var mets = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 2);
            var caloricbr = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            var calories = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            var capStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (mets !== 0xFFFF) {
                state.METs = mets / 100;
            }
            if (caloricbr !== 0xFFFF) {
                state.CaloricBurnRate = caloricbr / 10;
            }
            if (capStateBF & 0x01) {
                state.Calories = calories;
            }
            switch ((capStateBF & 0x70) >> 4) {
                case 1:
                    state.State = 'OFF';
                    break;
                case 2:
                    state.State = 'READY';
                    resetState(state);
                    break;
                case 3:
                    state.State = 'IN_USE';
                    break;
                case 4:
                    state.State = 'FINISHED';
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (capStateBF & 0x80) {
                // lap
            }
            break;
        }
        case 0x19: {
            var oldEventCount = state._EventCount0x19 || 0;
            var eventCount = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            var cadence = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            var accPower = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 3);
            var power = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 5) & 0xFFF;
            var trainerStatus = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6) >> 4;
            var flagStateBF = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (eventCount !== oldEventCount) {
                state._EventCount0x19 = eventCount;
                if (oldEventCount > eventCount) {
                    eventCount += 255;
                }
            }
            if (cadence !== 0xFF) {
                state.Cadence = cadence;
            }
            if (power !== 0xFFF) {
                state.InstantaneousPower = power;
                var oldAccPower = (state.AccumulatedPower || 0) % 65536;
                if (accPower !== oldAccPower) {
                    if (oldAccPower > accPower) {
                        accPower += 65536;
                    }
                }
                state.AccumulatedPower = (state.AccumulatedPower || 0) + accPower - oldAccPower;
                state.AveragePower = (accPower - oldAccPower) / (eventCount - oldEventCount);
            }
            state.TrainerStatus = trainerStatus;
            switch (flagStateBF & 0x03) {
                case 0:
                    state.TargetStatus = 'OnTarget';
                    break;
                case 1:
                    state.TargetStatus = 'LowSpeed';
                    break;
                case 2:
                    state.TargetStatus = 'HighSpeed';
                    break;
                default:
                    delete state.TargetStatus;
                    break;
            }
            switch ((flagStateBF & 0x70) >> 4) {
                case 1:
                    state.State = 'OFF';
                    break;
                case 2:
                    state.State = 'READY';
                    resetState(state);
                    break;
                case 3:
                    state.State = 'IN_USE';
                    break;
                case 4:
                    state.State = 'FINISHED';
                    break;
                default:
                    delete state.State;
                    break;
            }
            if (flagStateBF & 0x80) {
                // lap
            }
            break;
        }
        case 0x50: {
            state.HwVersion = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            state.ManId = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            state.ModelNum = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 6);
            break;
        }
        case 0x51: {
            var swRevSup = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            var swRevMain = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            var serial = data.readInt32LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            state.SwVersion = swRevMain;
            if (swRevSup !== 0xFF) {
                state.SwVersion += swRevSup / 1000;
            }
            if (serial !== 0xFFFFFFFF) {
                state.SerialNumber = serial;
            }
            break;
        }
        case 0x56: {
            var idx = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
            var tot = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
            var chState = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
            var devId = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 4);
            var trType = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 6);
            var devType = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 7);
            if (idx === 0) {
                state.PairedDevices = [];
            }
            if (tot > 0) {
                state.PairedDevices.push({ id: devId, type: devType, paired: (chState & 0x80) ? true : false });
            }
            break;
        }
        default:
            return;
    }
    sensor.emit('fitnessData', state);
}
//# sourceMappingURL=fitness-equipment-sensors.js.map