import type { CreateServicePolicyOptions, ServicePolicy } from "@metamask/controller-utils";
import type { JsonRpcRequest } from "@metamask/utils";
import { type Json, type JsonRpcParams, type JsonRpcResponse } from "@metamask/utils";
import type { AbstractRpcService } from "./abstract-rpc-service.mjs";
import type { AddToCockatielEventData, FetchOptions } from "./shared.mjs";
/**
 * Options for the RpcService constructor.
 */
export type RpcServiceOptions = {
    /**
     * A function that can be used to convert a binary string into a
     * base64-encoded ASCII string. Used to encode authorization credentials.
     */
    btoa: typeof btoa;
    /**
     * The URL of the RPC endpoint to hit.
     */
    endpointUrl: URL | string;
    /**
     * An RPC service that represents a failover endpoint which will be invoked
     * while the circuit for _this_ service is open.
     */
    failoverService?: AbstractRpcService;
    /**
     * A function that can be used to make an HTTP request. If your JavaScript
     * environment supports `fetch` natively, you'll probably want to pass that;
     * otherwise you can pass an equivalent (such as `fetch` via `node-fetch`).
     */
    fetch: typeof fetch;
    /**
     * A common set of options that will be used to make every request. Can be
     * overridden on the request level (e.g. to add headers).
     */
    fetchOptions?: FetchOptions;
    /**
     * Options to pass to `createServicePolicy`. Note that `retryFilterPolicy` is
     * not accepted, as it is overwritten. See {@link createServicePolicy}.
     */
    policyOptions?: Omit<CreateServicePolicyOptions, 'retryFilterPolicy'>;
};
/**
 * The maximum number of times that a failing service should be re-run before
 * giving up.
 */
export declare const DEFAULT_MAX_RETRIES = 4;
/**
 * The maximum number of times that the service is allowed to fail before
 * pausing further retries. This is set to a value such that if given a
 * service that continually fails, the policy needs to be executed 3 times
 * before further retries are paused.
 */
export declare const DEFAULT_MAX_CONSECUTIVE_FAILURES: number;
/**
 * The list of error messages that represent a failure to connect to the network.
 *
 * This list was derived from Sindre Sorhus's `is-network-error` package:
 * <https://github.com/sindresorhus/is-network-error/blob/7bbfa8be9482ce1427a21fbff60e3ee1650dd091/index.js>
 */
export declare const CONNECTION_ERRORS: {
    constructorName: string;
    pattern: RegExp;
}[];
/**
 * Custom JSON-RPC error codes for specific cases.
 *
 * These should be moved to `@metamask/rpc-errors` eventually.
 */
export declare const CUSTOM_RPC_ERRORS: {
    readonly unauthorized: -32006;
    readonly httpClientError: -32080;
};
/**
 * Determines whether the given error represents a failure to reach the network
 * after request parameters have been validated.
 *
 * This is somewhat difficult to verify because JavaScript engines (and in
 * some cases libraries) produce slightly different error messages for this
 * particular scenario, and we need to account for this.
 *
 * @param error - The error.
 * @returns True if the error indicates that the network cannot be connected to,
 * and false otherwise.
 */
export declare function isConnectionError(error: unknown): boolean;
/**
 * This class is responsible for making a request to an endpoint that implements
 * the JSON-RPC protocol. It is designed to gracefully handle network and server
 * failures, retrying requests using exponential backoff. It also offers a hook
 * which can used to respond to slow requests.
 */
export declare class RpcService implements AbstractRpcService {
    #private;
    /**
     * The URL of the RPC endpoint.
     */
    readonly endpointUrl: URL;
    /**
     * Constructs a new RpcService object.
     *
     * @param options - The options. See {@link RpcServiceOptions}.
     */
    constructor(options: RpcServiceOptions);
    /**
     * Listens for when the RPC service retries the request.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link ServicePolicy.onRetry} returns.
     * @see {@link createServicePolicy}
     */
    onRetry(listener: AddToCockatielEventData<Parameters<ServicePolicy['onRetry']>[0], {
        endpointUrl: string;
    }>): import("cockatiel").IDisposable;
    /**
     * Listens for when the RPC service retries the request too many times in a
     * row.
     *
     * @param listener - The callback to be called when the circuit is broken.
     * @returns What {@link ServicePolicy.onBreak} returns.
     * @see {@link createServicePolicy}
     */
    onBreak(listener: AddToCockatielEventData<Parameters<ServicePolicy['onBreak']>[0], {
        endpointUrl: string;
        failoverEndpointUrl?: string;
    }>): import("cockatiel").IDisposable;
    /**
     * Listens for when the policy underlying this RPC service detects a slow
     * request.
     *
     * @param listener - The callback to be called when the request is slow.
     * @returns What {@link ServicePolicy.onDegraded} returns.
     * @see {@link createServicePolicy}
     */
    onDegraded(listener: AddToCockatielEventData<Parameters<ServicePolicy['onDegraded']>[0], {
        endpointUrl: string;
    }>): import("cockatiel").IDisposable;
    /**
     * Makes a request to the RPC endpoint. If the circuit is open because this
     * request has failed too many times, the request is forwarded to a failover
     * service (if provided).
     *
     * This overload is specifically designed for `eth_getBlockByNumber`, which
     * can return a `result` of `null` despite an expected `Result` being
     * provided.
     *
     * @param jsonRpcRequest - The JSON-RPC request to send to the endpoint.
     * @param fetchOptions - An options bag for {@link fetch} which further
     * specifies the request.
     * @returns The decoded JSON-RPC response from the endpoint.
     * @throws An "authorized" JSON-RPC error (code -32006) if the response HTTP status is 401.
     * @throws A "rate limiting" JSON-RPC error (code -32005) if the response HTTP status is 429.
     * @throws A "resource unavailable" JSON-RPC error (code -32002) if the response HTTP status is 402, 404, or any 5xx.
     * @throws A generic HTTP client JSON-RPC error (code -32050) for any other 4xx HTTP status codes.
     * @throws A "parse" JSON-RPC error (code -32700) if the response is not valid JSON.
     */
    request<Params extends JsonRpcParams, Result extends Json>(jsonRpcRequest: JsonRpcRequest<Params> & {
        method: 'eth_getBlockByNumber';
    }, fetchOptions?: FetchOptions): Promise<JsonRpcResponse<Result> | JsonRpcResponse<null>>;
    /**
     * Makes a request to the RPC endpoint. If the circuit is open because this
     * request has failed too many times, the request is forwarded to a failover
     * service (if provided).
     *
     * This overload is designed for all RPC methods except for
     * `eth_getBlockByNumber`, which are expected to return a `result` of the
     * expected `Result`.
     *
     * @param jsonRpcRequest - The JSON-RPC request to send to the endpoint.
     * @param fetchOptions - An options bag for {@link fetch} which further
     * specifies the request.
     * @returns The decoded JSON-RPC response from the endpoint.
     * @throws An "authorized" JSON-RPC error (code -32006) if the response HTTP status is 401.
     * @throws A "rate limiting" JSON-RPC error (code -32005) if the response HTTP status is 429.
     * @throws A "resource unavailable" JSON-RPC error (code -32002) if the response HTTP status is 402, 404, or any 5xx.
     * @throws A generic HTTP client JSON-RPC error (code -32050) for any other 4xx HTTP status codes.
     * @throws A "parse" JSON-RPC error (code -32700) if the response is not valid JSON.
     */
    request<Params extends JsonRpcParams, Result extends Json>(jsonRpcRequest: JsonRpcRequest<Params>, fetchOptions?: FetchOptions): Promise<JsonRpcResponse<Result>>;
}
//# sourceMappingURL=rpc-service.d.mts.map