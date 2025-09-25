"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _RpcServiceChain_instances, _RpcServiceChain_services, _RpcServiceChain_buildRpcServiceChain;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcServiceChain = void 0;
const rpc_service_1 = require("./rpc-service.cjs");
/**
 * This class constructs a chain of RpcService objects which represent a
 * particular network. The first object in the chain is intended to be the
 * primary way of reaching the network and the remaining objects are used as
 * failovers.
 */
class RpcServiceChain {
    /**
     * Constructs a new RpcServiceChain object.
     *
     * @param rpcServiceConfigurations - The options for the RPC services
     * that you want to construct. Each object in this array is the same as
     * {@link RpcServiceOptions}.
     */
    constructor(rpcServiceConfigurations) {
        _RpcServiceChain_instances.add(this);
        _RpcServiceChain_services.set(this, void 0);
        __classPrivateFieldSet(this, _RpcServiceChain_services, __classPrivateFieldGet(this, _RpcServiceChain_instances, "m", _RpcServiceChain_buildRpcServiceChain).call(this, rpcServiceConfigurations), "f");
    }
    /**
     * Listens for when any of the RPC services retry a request.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link RpcService.onRetry} returns.
     */
    onRetry(listener) {
        const disposables = __classPrivateFieldGet(this, _RpcServiceChain_services, "f").map((service) => service.onRetry(listener));
        return {
            dispose() {
                disposables.forEach((disposable) => disposable.dispose());
            },
        };
    }
    /**
     * Listens for when any of the RPC services retry the request too many times
     * in a row.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link RpcService.onBreak} returns.
     */
    onBreak(listener) {
        const disposables = __classPrivateFieldGet(this, _RpcServiceChain_services, "f").map((service) => service.onBreak(listener));
        return {
            dispose() {
                disposables.forEach((disposable) => disposable.dispose());
            },
        };
    }
    /**
     * Listens for when any of the RPC services send a slow request.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link RpcService.onRetry} returns.
     */
    onDegraded(listener) {
        const disposables = __classPrivateFieldGet(this, _RpcServiceChain_services, "f").map((service) => service.onDegraded(listener));
        return {
            dispose() {
                disposables.forEach((disposable) => disposable.dispose());
            },
        };
    }
    async request(jsonRpcRequest, fetchOptions = {}) {
        return __classPrivateFieldGet(this, _RpcServiceChain_services, "f")[0].request(jsonRpcRequest, fetchOptions);
    }
}
exports.RpcServiceChain = RpcServiceChain;
_RpcServiceChain_services = new WeakMap(), _RpcServiceChain_instances = new WeakSet(), _RpcServiceChain_buildRpcServiceChain = function _RpcServiceChain_buildRpcServiceChain(rpcServiceConfigurations) {
    return [...rpcServiceConfigurations]
        .reverse()
        .reduce((workingServices, serviceConfiguration, index) => {
        const failoverService = index > 0 ? workingServices[0] : undefined;
        const service = new rpc_service_1.RpcService({
            ...serviceConfiguration,
            failoverService,
        });
        return [service, ...workingServices];
    }, []);
};
//# sourceMappingURL=rpc-service-chain.cjs.map