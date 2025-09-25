/**
 * Represents the availability state of the currently selected network.
 */
export var NetworkStatus;
(function (NetworkStatus) {
    /**
     * The network may or may not be able to receive requests, but either no
     * attempt has been made to determine this, or an attempt was made but was
     * unsuccessful.
     */
    NetworkStatus["Unknown"] = "unknown";
    /**
     * The network is able to receive and respond to requests.
     */
    NetworkStatus["Available"] = "available";
    /**
     * The network was unable to receive and respond to requests for unknown
     * reasons.
     */
    NetworkStatus["Unavailable"] = "unavailable";
    /**
     * The network is not only unavailable, but is also inaccessible for the user
     * specifically based on their location. This state only applies to Infura
     * networks.
     */
    NetworkStatus["Blocked"] = "blocked";
})(NetworkStatus || (NetworkStatus = {}));
export const INFURA_BLOCKED_KEY = 'countryBlocked';
/**
 * A set of deprecated network ChainId.
 * The network controller will exclude those the networks begin as default network,
 * without the need to remove the network from constant list of controller-utils.
 */
export const DEPRECATED_NETWORKS = new Set(['0xe704', '0x5']);
//# sourceMappingURL=constants.mjs.map