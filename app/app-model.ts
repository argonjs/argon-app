import { Observable, PropertyChangeData } from 'data/observable'
import { ObservableArray } from 'data/observable-array'
import { serializable, observable } from './decorators'
import * as platform from 'platform/platform'
import * as application from 'application'
import * as applicationSettings from 'application-settings'
import * as environment from './environment'
import * as URI from 'urijs'
import { LogItem } from 'argon-web-view'

import { getMetadata } from 'page-metadata-parser'
import * as domino from 'domino'

type Partial<T> = {
    [P in keyof T]?: T[P];
}

export async function requestMetadataForURI(url: string): Promise<any> {
    // const data = await fetch('https://unfurl.now.sh/?url=' + url)
    // return data.json()
    const response = await fetch(url)
    const html = await response.text()
    const doc = domino.createDocument(html)
    return getMetadata(doc, url)
}


export class BookmarkItem extends Observable {

    static collection = new Map<string, BookmarkItem>()

    static REALITY_LIVE = new BookmarkItem({
        uri: 'reality:live',
        title: 'Live'
    })

    static NEW_LAYER = new BookmarkItem({
        uri: '', 
        title: 'New Layer'
    })

    @serializable
    class = "BookmarkItem"

    constructor(json?: Partial<BookmarkItem>) {
        super()
        
        if (!json || json.uri === undefined || json.uri === null) 
            throw new Error("Expected 'uri' value!")

        if (BookmarkItem.collection.has(json.uri)) {
            const item = BookmarkItem.collection.get(json.uri)!
            Object.assign(item, json)
            return item
        }

        Object.assign(this, json)

        this.on('propertyChange', (evt: PropertyChangeData) => {
            if (evt.propertyName === 'uri') {
                throw new Error("Property 'uri' is read-only")
            }
        })
        
        if (!this.icon || !this.title) {
            this.requestMetadata()
        }

        BookmarkItem.collection.set(this.uri, this)
    }

    @observable()
    @serializable
    title = ''

    @observable()
    @serializable
    uri: string = ''

    @observable()
    @serializable
    icon = ''

    @observable()
    @serializable
    isFavorite = false

    @serializable
    overrideTitle = false

    @observable()
    metadata?:{}

    private _verifyURI(uri) {
        return fetch(uri, { method: 'HEAD' }).then((response) => {
            if (!response.ok) throw new Error()
        })
    }

    requestMetadata() {
        const uri = this.uri;
        requestMetadataForURI(uri).then((metadata) => {
            this.metadata = metadata

            if (!this.overrideTitle)
                this.title = metadata.title ?
                    (metadata.title as string).trim() : ''

            // make sure icon is available, if not fallback to icon from primary root domain page
            return this._verifyURI(metadata.icon).then(() => {
                this.icon = metadata.icon
            }).catch(()=>{
                const rootURI = new URI(uri).path('/').subdomain("").toString();
                return requestMetadataForURI(rootURI).then((rootMetadata) => {
                    return this._verifyURI(rootMetadata.icon).then(()=>{
                        this.icon = rootMetadata.icon
                    })
                })
            })

        }).catch((e) => {
            console.warn(`Unable to request metadata for ${uri}`)
        })
    }
}

export type XRImmersiveMode =  'reality' | 'augmentation' | 'none'

export class XRLayerDetails extends Observable {

    @serializable
    class = "LayerDetails"

    @observable({ type: BookmarkItem })
    content = BookmarkItem.NEW_LAYER

    @observable()
    log?: ObservableArray<LogItem>

    @observable({ equals: () => false })
    @serializable
    src = ''

    @observable()
    xrEnabled = false

    @observable()
    @serializable
    xrImmersiveMode:XRImmersiveMode = 'augmentation'

    @observable()
    xrAverageCPUTime:number = 0

    @observable()
    renderBufferScaleFactor = 1

    constructor(json?: Partial<XRLayerDetails>) {
        super()
        this.on('propertyChange', (evt: PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'src':
                    this.content = new BookmarkItem({uri:this.src})
                    break
                case 'content.uri':
                    this._setImmersiveModeFromContentURI()
                    break
                default: 
                    break
            }
        })
        this.src = json && (json.src || json.content && json.content.uri) || ''
        if (json) Object.assign(this, json)
    }

    private _setImmersiveModeFromContentURI() {
        const uri = this.content.uri
        if (uri === 'reality:live') {
            this.xrImmersiveMode = 'reality'
        } else if (uri === '' || uri === 'about:blank') {
            this.xrImmersiveMode = 'augmentation'
        } else {
            this.xrImmersiveMode = 'none'
        }
    }

    onLoadStarted() {
        this.xrEnabled = false
        this.xrAverageCPUTime = 0
        this._setImmersiveModeFromContentURI()
    }
}

export const defaultLayerItems:Array<BookmarkItem> = [
    BookmarkItem.REALITY_LIVE,
    new BookmarkItem({
        uri: 'https://examples.webxrexperiments.com'
    }),
    BookmarkItem.NEW_LAYER
]

export class AppModel extends Observable {

    @observable()
    globalRenderBufferScaleFactor = 0.5

    @observable()
    currentFrame = -1

    @observable()
    safeAreaInsets: { top: number, left: number, bottom: number, right: number } =
        { top: 0, left: 0, bottom: 0, right: 0 }

    @observable()
    screenSize: { width:number, height:number } = {
        width: platform.screen.mainScreen.widthDIPs,
        height: platform.screen.mainScreen.heightDIPs
    }

    @observable()
    overlayTop = 46

    @observable()
    overlayScrollEnabled = false

    @observable()
    @serializable
    uiMode: 'hidden' | 'expanded' | 'full' = 'expanded'

    @observable()
    layerPresentation: 'overview' | 'stack' = 'stack'

    @observable()
    immersiveStereoEnabled = false

    @observable()
    debugEnabled = false

    @observable()
    flashEnabled = false

    @observable()
    @serializable
    favorites = new ObservableArray<BookmarkItem>([
        new BookmarkItem({
            title: 'WebXR Samples',
            uri: 'https://examples.webxrexperiments.com',
            overrideTitle: true,
            isFavorite: true
        }),
        new BookmarkItem({
            title: 'Argon Samples',
            overrideTitle: true,
            uri: 'https://samples.argonjs.io/',
            isFavorite: true
        }),
        new BookmarkItem({
            title: 'AFrame + Argon Samples',
            overrideTitle: true,
            uri: 'https://aframe.argonjs.io/',
            isFavorite: true
        }),
        new BookmarkItem({
            title: 'Credits',
            overrideTitle: true,
            uri: 'http://www.argonjs.io/#support',
            isFavorite: true
        })
    ])

    @observable()
    @serializable
    layers = new ObservableArray<XRLayerDetails>()

    @observable({type: XRLayerDetails})
    realityLayer? = this.layers.getItem(0)

    @observable({type: XRLayerDetails})
    focussedLayer? = this.layers.getItem(this.layers.length - 1)

    constructor() {
        super()
        this.on('propertyChange', (evt:PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'layers': 
                    this.ensureLayersExists()
                    break
                case 'layerPresentation': 
                    this.ensureLayersExists()
                    break
            }
        })
        this.ensureLayersExists()
    }

    setFavorite(bookmarkItem: BookmarkItem, makeFavorite: boolean) {
        let foundItemIndex = -1
        this.favorites.forEach((item, index) => {
            if (item.uri === bookmarkItem.uri) {
                foundItemIndex = index
            }
        })
        bookmarkItem.isFavorite = makeFavorite
        if (makeFavorite) {
            if (foundItemIndex === -1) {
                this.favorites.push(bookmarkItem)
            } else {
                this.favorites.splice(foundItemIndex, 1, bookmarkItem)
            }
        } else if (foundItemIndex > -1) {
            this.favorites.splice(foundItemIndex, 1)
        }
    }

    onToggleFavorite(evt) {
        const bookmarkItem = this.focussedLayer!.content
        if (!bookmarkItem) return
        this.setFavorite(bookmarkItem, !bookmarkItem.isFavorite)
    }

    getDomainFromURL(url: string) {
        if (!url) return ''
        const uri = URI(url);
        return uri.domain()
    }

    getLayerURI(layer = this.focussedLayer) {
        if (!layer) return ''
        return layer.content.uri
    }

    getLayerDomain(layer = this.focussedLayer) {
        if (!layer) return ''
        return URI(layer.content.uri).domain()
    }

    getLayerTitle(layer = this.focussedLayer) {
        if (!layer) return ''
        return layer.content.title
    }

    getLayerImmersiveMode(layer = this.focussedLayer) {
        if (!layer) return ''
        return layer.xrImmersiveMode
    }

    private _fixURI(uri) {
        if (uri.includes(" ") || !uri.includes(".")) {
            // queries with spaces or single words without dots go to google search
            uri = "https://www.google.com/search?q=" + encodeURI(uri);
        }

        if (uri.indexOf('//') === -1) uri = '//' + uri;

        const uriObject = URI(uri);
        if (uriObject.protocol() !== "http" && uriObject.protocol() !== "https") {
            uriObject.protocol("https");
        }
        return uriObject.toString()
    }

    openURI(uri = '') {
        uri = this._fixURI(uri)
        if (!this.getLayerURI()) {
            this.focussedLayer!.src = uri
        } else {
            const newLayer = new XRLayerDetails()
            this.layers.push(newLayer)
            this.focussedLayer = newLayer
            this.focussedLayer.src = uri
        }
    }

    loadURI(uri = '', layer = this.focussedLayer) {
        if (!layer) {
            this.openURI(uri)
            return
        }

        // reload current URI if empty string
        if (!uri) uri = appModel.getLayerURI(layer)
        else uri = uri !== BookmarkItem.REALITY_LIVE.uri ? this._fixURI(uri) : uri
        layer.src = uri
    }

    save() {
        const json = JSON.stringify(this)
        console.log("Saving application state: \n" + json)
        applicationSettings.setString(APP_MODEL_KEY, json);
    }

    load() {
        const appModelJSON = applicationSettings.getString(APP_MODEL_KEY)
        // const appModelJSON = null
        if (!appModelJSON) {
            this.ensureLayersExists()
            return this
        }

        console.log("Loading from saved application state:\n" + appModelJSON)

        try {
            const jsonObject = JSON.parse(appModelJSON, (key: string, value) => {
                if (key[0] === '_') {
                    console.log('skipping ' + key); return;
                }

                if (value instanceof Array) {
                    return new ObservableArray(value)
                }

                if (value.class === 'BookmarkItem') {
                    return new BookmarkItem(value)
                }

                if (value.class === 'LayerDetails') {
                    return new XRLayerDetails(value)
                }

                return value
            })

            Object.assign(this, jsonObject)
            console.log('Successfully restored application settings!')

        } catch (e) {
            console.log("Unable to restore application settings!")
            console.log(e.message + '\n' + e.stack)
            if (environment.debug) alert('Unable to restore application settings!')
        }

        this.ensureLayersExists()

        return this
    }

    ensureLayersExists() {

        const ensureFocussedAndRealityLayerSelected = (layers:XRLayerDetails[]) => {
            const focussedIdx = layers.indexOf(<any>this.focussedLayer)    
            const realityIdx = layers.indexOf(<any>this.realityLayer)
            
            if (focussedIdx === -1)
                this.focussedLayer = layers[layers.length-1]
            
            if (realityIdx === -1) 
                this.realityLayer = layers.slice().find(layer => layer.xrImmersiveMode === 'reality')
        }

        if (this.layers.length === 0) {
            let newLayers:Array<XRLayerDetails> = []

            for (let bookmarkItem of defaultLayerItems) {
                newLayers.push(new XRLayerDetails({content:bookmarkItem}))
            }

            ensureFocussedAndRealityLayerSelected(newLayers)

            // push all new layers at once so the BrowserView only sorts them once
            this.layers.push(newLayers)

        } else {

            const realityLayer = this.layers.slice().find(layer => layer.xrImmersiveMode === 'reality')
            if (!realityLayer) {
                this.layers.push(new XRLayerDetails({ content: BookmarkItem.REALITY_LIVE }))
            }

            const nonRealityLayer = this.layers.slice().find(layer => layer.xrImmersiveMode !== 'reality')
            if (!nonRealityLayer) {
                this.layers.push(new XRLayerDetails())
            }

            ensureFocussedAndRealityLayerSelected(this.layers.slice())

        }
    }

}

const APP_MODEL_KEY = 'app_model'

export const appModel:AppModel = new AppModel().load()

application.on(application.suspendEvent, ()=>{
    appModel.save()
})