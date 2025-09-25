"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _RpcService_instances, _RpcService_fetch, _RpcService_fetchOptions, _RpcService_failoverService, _RpcService_policy, _RpcService_getDefaultFetchOptions, _RpcService_getCompleteFetchOptions, _RpcService_processRequest;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcService = exports.isConnectionError = exports.CUSTOM_RPC_ERRORS = exports.CONNECTION_ERRORS = exports.DEFAULT_MAX_CONSECUTIVE_FAILURES = exports.DEFAULT_MAX_RETRIES = void 0;
const controller_utils_1 = require("@metamask/controller-utils");
const rpc_errors_1 = require("@metamask/rpc-errors");
const utils_1 = require("@metamask/utils");
const deepmerge_1 = __importDefault(require("deepmerge"));
/**
 * The maximum number of times that a failing service should be re-run before
 * giving up.
 */
exports.DEFAULT_MAX_RETRIES = 4;
/**
 * The maximum number of times that the service is allowed to fail before
 * pausing further retries. This is set to a value such that if given a
 * service that continually fails, the policy needs to be executed 3 times
 * before further retries are paused.
 */
exports.DEFAULT_MAX_CONSECUTIVE_FAILURES = (1 + exports.DEFAULT_MAX_RETRIES) * 3;
/**
 * The list of error messages that represent a failure to connect to the network.
 *
 * This list was derived from Sindre Sorhus's `is-network-error` package:
 * <https://github.com/sindresorhus/is-network-error/blob/7bbfa8be9482ce1427a21fbff60e3ee1650dd091/index.js>
 */
exports.CONNECTION_ERRORS = [
    // Chrome
    {
        constructorName: 'TypeError',
        pattern: /network error/u,
    },
    // Chrome
    {
        constructorName: 'TypeError',
        pattern: /Failed to fetch/u,
    },
    // Firefox
    {
        constructorName: 'TypeError',
        pattern: /NetworkError when attempting to fetch resource\./u,
    },
    // Safari 16
    {
        constructorName: 'TypeError',
        pattern: /The Internet connection appears to be offline\./u,
    },
    // Safari 17+
    {
        constructorName: 'TypeError',
        pattern: /Load failed/u,
    },
    // `cross-fetch`
    {
        constructorName: 'TypeError',
        pattern: /Network request failed/u,
    },
    // `node-fetch`
    {
        constructorName: 'FetchError',
        pattern: /request to (.+) failed/u,
    },
    // Undici (Node.js)
    {
        constructorName: 'TypeError',
        pattern: /fetch failed/u,
    },
    // Undici (Node.js)
    {
        constructorName: 'TypeError',
        pattern: /terminated/u,
    },
];
/**
 * Custom JSON-RPC error codes for specific cases.
 *
 * These should be moved to `@metamask/rpc-errors` eventually.
 */
exports.CUSTOM_RPC_ERRORS = {
    unauthorized: -32006,
    httpClientError: -32080,
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
function isConnectionError(error) {
    if (!(typeof error === 'object' && error !== null && 'message' in error)) {
        return false;
    }
    const { message } = error;
    return (typeof message === 'string' &&
        !isNockError(message) &&
        exports.CONNECTION_ERRORS.some(({ constructorName, pattern }) => {
            return (error.constructor.name === constructorName && pattern.test(message));
        }));
}
exports.isConnectionError = isConnectionError;
/**
 * Determines whether the given error message refers to a Nock error.
 *
 * It's important that if we failed to mock a request in a test, the resulting
 * error does not cause the request to be retried so that we can see it right
 * away.
 *
 * @param message - The error message to test.
 * @returns True if the message indicates a missing Nock mock, false otherwise.
 */
function isNockError(message) {
    return message.includes('Nock:');
}
/**
 * Determine whether the given error message indicates a failure to parse JSON.
 *
 * This is different in tests vs. implementation code because it may manifest as
 * a FetchError or a SyntaxError.
 *
 * @param error - The error object to test.
 * @returns True if the error indicates a JSON parse error, false otherwise.
 */
function isJsonParseError(error) {
    return (error instanceof SyntaxError ||
        /invalid json/iu.test((0, utils_1.getErrorMessage)(error)));
}
/**
 * Guarantees a URL, even given a string. This is useful for checking components
 * of that URL.
 *
 * @param endpointUrlOrUrlString - Either a URL object or a string that
 * represents the URL of an endpoint.
 * @returns A URL object.
 */
function getNormalizedEndpointUrl(endpointUrlOrUrlString) {
    return endpointUrlOrUrlString instanceof URL
        ? endpointUrlOrUrlString
        : new URL(endpointUrlOrUrlString);
}
/**
 * Strips username and password from a URL.
 *
 * @param url - The URL to strip credentials from.
 * @returns A new URL object with credentials removed.
 */
function stripCredentialsFromUrl(url) {
    const strippedUrl = new URL(url.toString());
    strippedUrl.username = '';
    strippedUrl.password = '';
    return strippedUrl;
}
/**
 * This class is responsible for making a request to an endpoint that implements
 * the JSON-RPC protocol. It is designed to gracefully handle network and server
 * failures, retrying requests using exponential backoff. It also offers a hook
 * which can used to respond to slow requests.
 */
class RpcService {
    /**
     * Constructs a new RpcService object.
     *
     * @param options - The options. See {@link RpcServiceOptions}.
     */
    constructor(options) {
        _RpcService_instances.add(this);
        /**
         * The function used to make an HTTP request.
         */
        _RpcService_fetch.set(this, void 0);
        /**
         * A common set of options that the request options will extend.
         */
        _RpcService_fetchOptions.set(this, void 0);
        /**
         * An RPC service that represents a failover endpoint which will be invoked
         * while the circuit for _this_ service is open.
         */
        _RpcService_failoverService.set(this, void 0);
        /**
         * The policy that wraps the request.
         */
        _RpcService_policy.set(this, void 0);
        const { btoa: givenBtoa, endpointUrl, failoverService, fetch: givenFetch, fetchOptions = {}, policyOptions = {}, } = options;
        __classPrivateFieldSet(this, _RpcService_fetch, givenFetch, "f");
        const normalizedUrl = getNormalizedEndpointUrl(endpointUrl);
        __classPrivateFieldSet(this, _RpcService_fetchOptions, __classPrivateFieldGet(this, _RpcService_instances, "m", _RpcService_getDefaultFetchOptions).call(this, normalizedUrl, fetchOptions, givenBtoa), "f");
        this.endpointUrl = stripCredentialsFromUrl(normalizedUrl);
        __classPrivateFieldSet(this, _RpcService_failoverService, failoverService, "f");
        const policy = (0, controller_utils_1.createServicePolicy)({
            maxRetries: exports.DEFAULT_MAX_RETRIES,
            maxConsecutiveFailures: exports.DEFAULT_MAX_CONSECUTIVE_FAILURES,
            ...policyOptions,
            retryFilterPolicy: (0, controller_utils_1.handleWhen)((error) => {
                return (
                // Ignore errors where the request failed to establish
                isConnectionError(error) ||
                    // Ignore server sent HTML error pages or truncated JSON responses
                    isJsonParseError(error) ||
                    // Ignore server overload errors
                    ('httpStatus' in error &&
                        (error.httpStatus === 502 ||
                            error.httpStatus === 503 ||
                            error.httpStatus === 504)) ||
                    ((0, utils_1.hasProperty)(error, 'code') &&
                        (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')));
            }),
        });
        __classPrivateFieldSet(this, _RpcService_policy, policy, "f");
    }
    /**
     * Listens for when the RPC service retries the request.
     *
     * @param listener - The callback to be called when the retry occurs.
     * @returns What {@link ServicePolicy.onRetry} returns.
     * @see {@link createServicePolicy}
     */
    onRetry(listener) {
        return __classPrivateFieldGet(this, _RpcService_policy, "f").onRetry((data) => {
            listener({ ...data, endpointUrl: this.endpointUrl.toString() });
        });
    }
    /**
     * Listens for when the RPC service retries the request too many times in a
     * row.
     *
     * @param listener - The callback to be called when the circuit is broken.
     * @returns What {@link ServicePolicy.onBreak} returns.
     * @see {@link createServicePolicy}
     */
    onBreak(listener) {
        return __classPrivateFieldGet(this, _RpcService_policy, "f").onBreak((data) => {
            listener({
                ...data,
                endpointUrl: this.endpointUrl.toString(),
                failoverEndpointUrl: __classPrivateFieldGet(this, _RpcService_failoverService, "f")
                    ? __classPrivateFieldGet(this, _RpcService_failoverService, "f").endpointUrl.toString()
                    : undefined,
            });
        });
    }
    /**
     * Listens for when the policy underlying this RPC service detects a slow
     * request.
     *
     * @param listener - The callback to be called when the request is slow.
     * @returns What {@link ServicePolicy.onDegraded} returns.
     * @see {@link createServicePolicy}
     */
    onDegraded(listener) {
        return __classPrivateFieldGet(this, _RpcService_policy, "f").onDegraded((data) => {
            listener({ ...(data ?? {}), endpointUrl: this.endpointUrl.toString() });
        });
    }
    async request(jsonRpcRequest, fetchOptions = {}) {
        const completeFetchOptions = __classPrivateFieldGet(this, _RpcService_instances, "m", _RpcService_getCompleteFetchOptions).call(this, jsonRpcRequest, fetchOptions);
        try {
            return await __classPrivateFieldGet(this, _RpcService_instances, "m", _RpcService_processRequest).call(this, completeFetchOptions);
        }
        catch (error) {
            if (__classPrivateFieldGet(this, _RpcService_policy, "f").circuitBreakerPolicy.state === controller_utils_1.CircuitState.Open &&
                __classPrivateFieldGet(this, _RpcService_failoverService, "f") !== undefined) {
                return await __classPrivateFieldGet(this, _RpcService_failoverService, "f").request(jsonRpcRequest, completeFetchOptions);
            }
            throw error;
        }
    }
}
exports.RpcService = RpcService;
_RpcService_fetch = new WeakMap(), _RpcService_fetchOptions = new WeakMap(), _RpcService_failoverService = new WeakMap(), _RpcService_policy = new WeakMap(), _RpcService_instances = new WeakSet(), _RpcService_getDefaultFetchOptions = function _RpcService_getDefaultFetchOptions(endpointUrl, fetchOptions, givenBtoa) {
    if (endpointUrl.username && endpointUrl.password) {
        const authString = `${endpointUrl.username}:${endpointUrl.password}`;
        const encodedCredentials = givenBtoa(authString);
        return (0, deepmerge_1.default)(fetchOptions, {
            headers: { Authorization: `Basic ${encodedCredentials}` },
        });
    }
    return fetchOptions;
}, _RpcService_getCompleteFetchOptions = function _RpcService_getCompleteFetchOptions(jsonRpcRequest, fetchOptions) {
    const defaultOptions = {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    };
    const mergedOptions = (0, deepmerge_1.default)(defaultOptions, (0, deepmerge_1.default)(__classPrivateFieldGet(this, _RpcService_fetchOptions, "f"), fetchOptions));
    const { id, jsonrpc, method, params } = jsonRpcRequest;
    const body = JSON.stringify({
        id,
        jsonrpc,
        method,
        params,
    });
    return { ...mergedOptions, body };
}, _RpcService_processRequest = 
/**
 * Makes the request using the Cockatiel policy that this service creates.
 *
 * @param fetchOptions - The options for `fetch`; will be combined with the
 * fetch options passed to the constructor
 * @returns The decoded JSON-RPC response from the endpoint.
 * @throws An "authorized" JSON-RPC error (code -32006) if the response HTTP status is 401.
 * @throws A "rate limiting" JSON-RPC error (code -32005) if the response HTTP status is 429.
 * @throws A "resource unavailable" JSON-RPC error (code -32002) if the response HTTP status is 402, 404, or any 5xx.
 * @throws A generic HTTP client JSON-RPC error (code -32050) for any other 4xx HTTP status codes.
 * @throws A "parse" JSON-RPC error (code -32700) if the response is not valid JSON.
 */
async function _RpcService_processRequest(fetchOptions) {
    let response;
    try {
        return await __classPrivateFieldGet(this, _RpcService_policy, "f").execute(async () => {
            response = await __classPrivateFieldGet(this, _RpcService_fetch, "f").call(this, this.endpointUrl, fetchOptions);
            if (!response.ok) {
                throw new controller_utils_1.HttpError(response.status);
            }
            return await response.json();
        });
    }
    catch (error) {
        if (error instanceof controller_utils_1.HttpError) {
            const status = error.httpStatus;
            if (status === 401) {
                throw new rpc_errors_1.JsonRpcError(exports.CUSTOM_RPC_ERRORS.unauthorized, 'Unauthorized.', {
                    httpStatus: status,
                });
            }
            if (status === 429) {
                throw rpc_errors_1.rpcErrors.limitExceeded({
                    message: 'Request is being rate limited.',
                    data: {
                        httpStatus: status,
                    },
                });
            }
            if (status >= 500 || status === 402 || status === 404) {
                throw rpc_errors_1.rpcErrors.resourceUnavailable({
                    message: 'RPC endpoint not found or unavailable.',
                    data: {
                        httpStatus: status,
                    },
                });
            }
            // Handle all other 4xx errors as generic HTTP client errors
            throw new rpc_errors_1.JsonRpcError(exports.CUSTOM_RPC_ERRORS.httpClientError, 'RPC endpoint returned HTTP client error.', {
                httpStatus: status,
            });
        }
        else if (isJsonParseError(error)) {
            throw rpc_errors_1.rpcErrors.parse({
                message: 'RPC endpoint did not return JSON.',
            });
        }
        throw error;
    }
};
//# sourceMappingURL=rpc-service.cjs.map