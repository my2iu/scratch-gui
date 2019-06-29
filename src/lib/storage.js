import ScratchStorage from 'scratch-storage';

import defaultProject from './default-project';

class LocalStorageHelper {
    constructor(types) {
        this.types = types;
    }
    load (assetType, assetId, dataFormat) {
        if (this.types.indexOf(assetType.name) < 0) {
            return Promise.resolve(null);
        }
        
        const url = `medialibraries/${assetId}.${dataFormat}`;
        
        return new Promise(function (resolve, reject) {
            const xmlhttp = new XMLHttpRequest();
            xmlhttp.open('GET', url);
            xmlhttp.responseType = 'arraybuffer';
            xmlhttp.onload = () => {
                if ((xmlhttp.status >= 200 && xmlhttp.status < 300) 
                        || xmlhttp.status == 0)  // When reading from disk in Chrome, it's possible to have a status of 0
                    resolve({
                            data: new Uint8Array(xmlhttp.response),
                            assetType: assetType,
                            dataFormat: dataFormat,
                            base64: null,
                            decodeText: function() {
                                return new TextDecoder().decode(this.data);
                            },
                            encodeTextData: function(str, dataFormat, generateId) {
                                this.data = new TextEncoder().encode(str);
                            },
                            // encodeDataURI was adapted from LLK's scratch-storage code
                            encodeDataURI: function(contentType) {
                                if (this.base64 != null) return this.base64;
                                if (contentType == null)
                                    contentType = this.assetType.contentType;
                                const uint8Data = this.data;
                                let ascii = '';
                                for (let i = 0; i < uint8Data.byteLength; i++) {
                                    ascii += String.fromCharCode( uint8Data[i] );
                                }
                                this.base64 = `data:${contentType};base64,${btoa(ascii)}`;
                                return this.base64;
                            }
                        });
                else
                    reject(xmlhttp.status);
            };
            xmlhttp.onerror = () => {
                reject(xmlhttp.status);
            };
            xmlhttp.send();
        });
    }
}

/**
 * Wrapper for ScratchStorage which adds default web sources.
 * @todo make this more configurable
 */
class Storage extends ScratchStorage {
    constructor () {
        super();
        this.cacheDefaultProject();
        this.localHelper = new LocalStorageHelper([this.AssetType.ImageVector.name, this.AssetType.ImageBitmap.name, this.AssetType.Sound.name]);
    }
    addOfficialScratchWebStores () {
        this.addWebStore(
            [this.AssetType.Project],
            this.getProjectGetConfig.bind(this),
            this.getProjectCreateConfig.bind(this),
            this.getProjectUpdateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.ImageVector, this.AssetType.ImageBitmap, this.AssetType.Sound],
            this.getAssetGetConfig.bind(this),
            // We set both the create and update configs to the same method because
            // storage assumes it should update if there is an assetId, but the
            // asset store uses the assetId as part of the create URI.
            this.getAssetCreateConfig.bind(this),
            this.getAssetCreateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.Sound],
            asset => `static/extension-assets/scratch3_music/${asset.assetId}.${asset.dataFormat}`
        );
    }
    addLocalWebStores() {
        this.addHelper(this.localHelper);
    }
    setProjectHost (projectHost) {
        this.projectHost = projectHost;
    }
    getProjectGetConfig (projectAsset) {
        return `${this.projectHost}/${projectAsset.assetId}`;
    }
    getProjectCreateConfig () {
        return {
            url: `${this.projectHost}/`,
            withCredentials: true
        };
    }
    getProjectUpdateConfig (projectAsset) {
        return {
            url: `${this.projectHost}/${projectAsset.assetId}`,
            withCredentials: true
        };
    }
    setAssetHost (assetHost) {
        this.assetHost = assetHost;
    }
    getAssetGetConfig (asset) {
        return `${this.assetHost}/internalapi/asset/${asset.assetId}.${asset.dataFormat}/get/`;
    }
    getAssetCreateConfig (asset) {
        return {
            // There is no such thing as updating assets, but storage assumes it
            // should update if there is an assetId, and the asset store uses the
            // assetId as part of the create URI. So, force the method to POST.
            // Then when storage finds this config to use for the "update", still POSTs
            method: 'post',
            url: `${this.assetHost}/${asset.assetId}.${asset.dataFormat}`,
            withCredentials: true
        };
    }
    setTranslatorFunction (translator) {
        this.translator = translator;
        this.cacheDefaultProject();
    }
    cacheDefaultProject () {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}

const storage = new Storage();

export default storage;
