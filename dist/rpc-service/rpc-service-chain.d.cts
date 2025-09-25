import type { Json, JsonRpcParams, JsonRpcRequest, JsonRpcResponse } from "@metamask/utils";
import { RpcService } from "./rpc-service.cjs";
import type { RpcServiceOptions } from "./rpc-service.cjs";
import type { RpcServiceRequestable } from "./rpc-service-requestable.cjs";
import type { FetchOptions } from "./shared.cjs";
/**
 * This class constructs a chain of RpcService objects which represent a
 * particular network. The first object in the chain is intended to be the
 * primary way of reaching the network and the remaining objects are used as
 * failovers.
 */
export declare class RpcServiceChain implements RpcServiceRequestable {
    #private;
    /**
     * Constructs a new RpcServiceChain object.
     *
     * @param rpcServiceConfigurations - The options for the RPC services
     * that you want to construct. Each object in this array is the same as
     * {@link RpcServiceOptions}.
     */
    constructor(rpcServiceConfigurations: Omit<RpcServiceOptions, 'failoverService'>[]);
    /**
     * Listens for when any of the RPC services retry a request.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link RpcService.onRetry} returns.
     */
    onRetry(listener: Parameters<RpcService['onRetry']>[0]): {
        dispose(): void;
    };
    /**
     * Listens for when any of the RPC services retry the request too many times
     * in a row.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link RpcService.onBreak} returns.
     */
    onBreak(listener: Parameters<RpcService['onBreak']>[0]): {
        dispose(): void;
    };
    /**
     * Listens for when any of the RPC services send a slow request.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link RpcService.onRetry} returns.
     */
    onDegraded(listener: Parameters<RpcService['onDegraded']>[0]): {
        dispose(): void;
    };
    /**
     * Makes a request to the first RPC service in the chain. If this service is
     * down, then the request is forwarded to the next service in the chain, etc.
     *
     * This overload is specifically designed for `eth_getBlockByNumber`, which
     * can return a `result` of `null` despite an expected `Result` being
     * provided.
     *
     * @param jsonRpcRequest - The JSON-RPC request to send to the endpoint.
     * @param fetchOptions - An options bag for {@link fetch} which further
     * specifies the request.
     * @returns The decoded JSON-RPC response from the endpoint.
     * @throws A 401 error if the response status is 401.
     * @throws A "rate limiting" error if the response HTTP status is 429.
     * @throws A "resource unavailable" error if the response status is 402, 404, or any 5xx.
     * @throws A generic HTTP client error (-32100) for any other 4xx status codes.
     * @throws A "parse" error if the response is not valid JSON.
     */
    request<Params extends JsonRpcParams, Result extends Json>(jsonRpcRequest: JsonRpcRequest<Params> & {
        method: 'eth_getBlockByNumber';
    }, fetchOptions?: FetchOptions): Promise<JsonRpcResponse<Result> | JsonRpcResponse<null>>;
    /**
     * Makes a request to the first RPC service in the chain. If this service is
     * down, then the request is forwarded to the next service in the chain, etc.
     *
     * This overload is designed for all RPC methods except for
     * `eth_getBlockByNumber`, which are expected to return a `result` of the
     * expected `Result`.
     *
     * @param jsonRpcRequest - The JSON-RPC request to send to the endpoint.
     * @param fetchOptions - An options bag for {@link fetch} which further
     * specifies the request.
     * @returns The decoded JSON-RPC response from the endpoint.
     * @throws A 401 error if the response status is 401.
     * @throws A "rate limiting" error if the response HTTP status is 429.
     * @throws A "resource unavailable" error if the response status is 402, 404, or any 5xx.
     * @throws A generic HTTP client error (-32100) for any other 4xx status codes.
     * @throws A "parse" error if the response is not valid JSON.
     */
    request<Params extends JsonRpcParams, Result extends Json>(jsonRpcRequest: JsonRpcRequest<Params>, fetchOptions?: FetchOptions): Promise<JsonRpcResponse<Result>>;
}
//# sourceMappingURL=rpc-service-chain.d.cts.map