import {Observable, PropertyChangeData} from 'data/observable'
import {ObservableArray} from 'data/observable-array'

// interface prototypeof<T> {
//     prototype:T;
// }


// declare type OP = typeof Observable.prototype

const strictEquality = (oldValue, newValue) => oldValue === newValue

export const observablePropertiesSymbol = Symbol('observableProperties')

export interface ObservableDecoratorOptions {
    /**
     * The function to use for equality checks 
     */
    equals?:typeof strictEquality
    /**
     * The property type. If this is provided, it enables propertyChange event forwarding 
     *  of the form `${parentKey}.${childKey}`
     */
    type?: {new(): Observable}
}

export function observable({
    equals = strictEquality,
    type,
}:ObservableDecoratorOptions={}) {
    return (prototype, key:string) => {
        let observableProperties:Set<string> = prototype[observablePropertiesSymbol] 
        if (!observableProperties) {
            observableProperties = prototype[observablePropertiesSymbol] = new Set
        }
        observableProperties.add(key)

        const privateKey = '_' + key;
        prototype[privateKey+'Equals'] = equals
        const propertyChangeListenerSymbol = Symbol(key+"PropertyChangeListener")

        Object.defineProperty(prototype, key, {
            get: function(this:Observable) {
                return this[privateKey];
            },
            set: function(this:Observable, value:Observable|any) {
                if (equals(this[privateKey],value)) {
                    return
                }

                const oldValue = this[privateKey]
                this[privateKey] = value
                this.notifyPropertyChange(key, value, oldValue)

                // if type is defined, emit property changes events on the parent observable of the form
                // `${parentKey}.${childKey}`. Such events will continue to bubble up the Observable property heirarchy 
                // as long as the Observable type is provided for the observed property, allowing leaf properties to be
                // observed directly from the root observable
                if (type && type.prototype instanceof Observable) {
                    const notifyChildPropertyChange = (childKey, childValue, oldChildValue) => {
                        this.notifyPropertyChange(`${key}.${childKey}`, childValue, oldChildValue)
                    }

                    let propertyChangeListener = this[propertyChangeListenerSymbol]
                    if (!propertyChangeListener) propertyChangeListener = this[propertyChangeListenerSymbol] = (evt:PropertyChangeData) => {
                        notifyChildPropertyChange(evt.propertyName, evt.value, evt.oldValue)
                    }
                    
                    if (oldValue && oldValue instanceof Observable) oldValue.off('propertyChange', propertyChangeListener)
                    if (value && value instanceof Observable) value.on('propertyChange', propertyChangeListener)

                    const childObservableProperties = type.prototype[observablePropertiesSymbol] as Set<string>
                    childObservableProperties.forEach(childKey => {
                        const childValue = value && value[childKey]
                        const oldChildValue = oldValue && oldValue[childKey]
                        const childPropertyEquals = type.prototype['_'+childKey+'Equals']
                        if (!childPropertyEquals(childValue, oldChildValue))
                            notifyChildPropertyChange(childKey, childValue, oldChildValue)
                    })
                }
            },
            enumerable: true,
            configurable: true
        });
    }
}

export const serializablePropertiesSymbol = Symbol('observableProperties')

export function serializable(prototype, key:string) {
    let serializedProperties = prototype[serializablePropertiesSymbol] as Set<string>
    if (!serializedProperties) {
        serializedProperties = prototype[serializablePropertiesSymbol] = new Set
        prototype['toJSON'] = function() {
            const jsonObject = {}
            serializedProperties.forEach((key)=>{
                let value = this[key]
                if (value instanceof ObservableArray) {
                    value = value.slice()
                }
                jsonObject[key] = value
            })
            return jsonObject
        }
    }
    serializedProperties.add(key)
}

export function bind<T extends Function>(target: object, key: string, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void {
    if(!descriptor || (typeof descriptor.value !== 'function')) {
        throw new TypeError(`Only methods can be decorated with @bind. <${key}> is not a method!`);
    }
    return {
        configurable: true,
        get() {
            const bound: T = descriptor.value!.bind(this);
            Object.defineProperty(this, key, {
                value: bound,
                configurable: true,
                writable: true,
            });
            return bound;
        }
    };
}
