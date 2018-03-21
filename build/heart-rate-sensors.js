"use strict";
/*
 * ANT+ profile: https://www.thisisant.com/developer/ant-plus/device-profiles/#526_tab
 * Spec sheet: https://www.thisisant.com/resources/heart-rate-monitor/
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
var HeartRateSensorState = /** @class */ (function () {
    function HeartRateSensorState(deviceId) {
        this.DeviceID = deviceId;
    }
    return HeartRateSensorState;
}());
var HeartRateScannerState = /** @class */ (function (_super) {
    __extends(HeartRateScannerState, _super);
    function HeartRateScannerState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HeartRateScannerState;
}(HeartRateSensorState));
var PageState;
(function (PageState) {
    PageState[PageState["INIT_PAGE"] = 0] = "INIT_PAGE";
    PageState[PageState["STD_PAGE"] = 1] = "STD_PAGE";
    PageState[PageState["EXT_PAGE"] = 2] = "EXT_PAGE";
})(PageState || (PageState = {}));
var HeartRateSensor = /** @class */ (function (_super) {
    __extends(HeartRateSensor, _super);
    function HeartRateSensor(stick) {
        var _this = _super.call(this, stick) || this;
        _this.page = {
            oldPage: -1,
            pageState: PageState.INIT_PAGE,
        };
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    HeartRateSensor.prototype.attach = function (channel, deviceID) {
        _super.prototype.attach.call(this, channel, 'receive', deviceID, HeartRateSensor.deviceType, 0, 255, 8070);
        this.state = new HeartRateSensorState(deviceID);
    };
    HeartRateSensor.prototype.decodeData = function (data) {
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
                updateState(this, this.state, this.page, data);
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
    HeartRateSensor.deviceType = 120;
    return HeartRateSensor;
}(Ant.AntPlusSensor));
exports.HeartRateSensor = HeartRateSensor;
var HeartRateScanner = /** @class */ (function (_super) {
    __extends(HeartRateScanner, _super);
    function HeartRateScanner(stick) {
        var _this = _super.call(this, stick) || this;
        _this.states = {};
        _this.pages = {};
        _this.decodeDataCbk = _this.decodeData.bind(_this);
        return _this;
    }
    HeartRateScanner.prototype.scan = function () {
        _super.prototype.scan.call(this, 'receive');
    };
    HeartRateScanner.prototype.decodeData = function (data) {
        if (data.length <= (Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 3) || !(data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN) & 0x80)) {
            console.log('wrong message format');
            return;
        }
        var deviceId = data.readUInt16LE(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 1);
        var deviceType = data.readUInt8(Messages.BUFFER_INDEX_EXT_MSG_BEGIN + 3);
        if (deviceType !== HeartRateScanner.deviceType) {
            return;
        }
        if (!this.states[deviceId]) {
            this.states[deviceId] = new HeartRateScannerState(deviceId);
        }
        if (!this.pages[deviceId]) {
            this.pages[deviceId] = { oldPage: -1, pageState: PageState.INIT_PAGE };
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
                updateState(this, this.states[deviceId], this.pages[deviceId], data);
                break;
            default:
                break;
        }
    };
    HeartRateScanner.deviceType = 120;
    return HeartRateScanner;
}(Ant.AntPlusScanner));
exports.HeartRateScanner = HeartRateScanner;
var TOGGLE_MASK = 0x80;
function updateState(sensor, state, page, data) {
    var pageNum = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA);
    if (page.pageState === PageState.INIT_PAGE) {
        page.pageState = PageState.STD_PAGE; // change the state to STD_PAGE and allow the checking of old and new pages
        // decode with pages if the page byte or toggle bit has changed
    }
    else if ((pageNum !== page.oldPage) || (page.pageState === PageState.EXT_PAGE)) {
        page.pageState = PageState.EXT_PAGE; // set the state to use the extended page format
        switch (pageNum & ~TOGGLE_MASK) {
            case 1:
                //decode the cumulative operating time
                state.OperatingTime = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
                state.OperatingTime |= data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2) << 8;
                state.OperatingTime |= data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3) << 16;
                state.OperatingTime *= 2;
                break;
            case 2:
                //decode the Manufacturer ID
                state.ManId = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
                //decode the 4 byte serial number
                state.SerialNumber = sensor.deviceID;
                state.SerialNumber |= data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 2) << 16;
                state.SerialNumber >>>= 0;
                break;
            case 3:
                //decode HW version, SW version, and model number
                state.HwVersion = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
                state.SwVersion = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
                state.ModelNum = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
                break;
            case 4:
                //decode the previous heart beat measurement time
                state.PreviousBeat = data.readUInt16LE(Messages.BUFFER_INDEX_MSG_DATA + 2);
                break;
            case 5:
                state.IntervalAverage = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
                state.IntervalMax = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
                state.SessionAverage = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
                break;
            case 6:
                state.SupportedFeatures = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
                state.EnabledFeatures = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
                break;
            case 7: {
                var batteryLevel = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 1);
                var batteryFrac = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 2);
                var batteryStatus = data.readUInt8(Messages.BUFFER_INDEX_MSG_DATA + 3);
                if (batteryLevel !== 0xFF) {
                    state.BatteryLevel = batteryLevel;
                }
                state.BatteryVoltage = (batteryStatus & 0x0F) + (batteryFrac / 256);
                var batteryFlags = batteryStatus & 0x70;
                switch (batteryFlags) {
                    case 1:
                        state.BatteryStatus = 'New';
                        break;
                    case 2:
                        state.BatteryStatus = 'Good';
                        break;
                    case 3:
                        state.BatteryStatus = 'Ok';
                        break;
                    case 4:
                        state.BatteryStatus = 'Low';
                        break;
                    case 5:
                        state.BatteryStatus = 'Critical';
                        break;
                    default:
                        state.BatteryVoltage = undefined;
                        state.BatteryStatus = 'Invalid';
                        break;
                }
                break;
            }
            default:
                break;
        }
    }
    // decode the last four bytes of the HRM format, the first byte of this message is the channel number
    DecodeDefaultHRM(state, data.slice(Messages.BUFFER_INDEX_MSG_DATA + 4));
    page.oldPage = pageNum;
    sensor.emit('hbdata', state);
    sensor.emit('hbData', state);
}
function DecodeDefaultHRM(state, pucPayload) {
    // decode the measurement time data (two bytes)
    state.BeatTime = pucPayload.readUInt16LE(0);
    // decode the measurement count data
    state.BeatCount = pucPayload.readUInt8(2);
    // decode the measurement count data
    state.ComputedHeartRate = pucPayload.readUInt8(3);
}
//# sourceMappingURL=heart-rate-sensors.js.map