/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    List.h

@brief
    Header file for List<> data structure and helper classes
===============================================================================*/

#ifndef _VUFORIA_LIST_H_
#define _VUFORIA_LIST_H_

#include <Vuforia/System.h>

namespace Vuforia
{

/// Abstract base class for list data providers defined by Vuforia
template <typename ValueType>
class ListDataProvider
{
public:

    virtual ValueType* getItem(int pos) = 0;
    virtual int size() = 0;
    virtual ListDataProvider* acquire() = 0;
    virtual void release() = 0;
    virtual ListDataProvider<const ValueType>* constView() = 0;
    virtual ~ListDataProvider() {}
};


/// Implementation detail namespace - iterator type, iterator operations.
namespace Impl
{
template <typename ValueType>
class ListIterator
{
public:

    typedef ListDataProvider<ValueType> ProviderType;
    typedef int difference_type;
    typedef ValueType* value_type;
    typedef ValueType** pointer;
    typedef ValueType*& reference;
    typedef ValueType*const& const_reference;

    ListIterator(ProviderType* provider_, int index_) : provider(provider_), index(index_) {}

    /// Accessing the values
    value_type operator*() const
    {
        return provider->getItem(index);
    }
    value_type operator[](difference_type n) const
    {
        return provider->getItem(index + n);
    }

    /// Comparison operators
    bool operator==(ListIterator const& other) const
    {
        return index == other.index;
    }
    bool operator!=(ListIterator const& other) const
    {
        return !(*this == other);
    }
    bool operator<(ListIterator other) const
    {
        return index < other.index;
    }
    bool operator>(ListIterator other) const
    {
        return index > other.index;
    }
    bool operator<=(ListIterator other) const
    {
        return index <= other.index;
    }
    bool operator>=(ListIterator other) const
    {
        return index >= other.index;
    }

    /// Iterator navigation
    ListIterator& operator++()
    {
        ++index; return *this;
    }
    ListIterator operator++(int)
    {
        auto ret = *this;  ++index; return ret;
    }
    ListIterator& operator--()
    {
        --index; return *this;
    }
    ListIterator operator--(int)
    {
        auto ret = *this; --index; return ret;
    }

    /// RandomAccessIterator requirements
    ListIterator& operator+=(difference_type n)
    {
        index += n; return *this;
    }
    ListIterator& operator-=(difference_type n)
    {
        index -= n; return *this;
    }
    difference_type operator-(ListIterator other) const
    {
        return index-other.index;
    }

private:

    mutable ProviderType* provider;
    int index;
};

template <typename ValueType>
ListIterator<ValueType> operator+(
        ListIterator<ValueType> it, 
        typename ListIterator<ValueType>::difference_type n
    )
{
    it += n; return it;
}
template <typename ValueType>
ListIterator<ValueType> operator+(
        typename ListIterator<ValueType>::difference_type n, 
        ListIterator<ValueType> it
    )
{
    it += n; return it;
}
template <typename ValueType>
ListIterator<ValueType> operator-(
        ListIterator<ValueType> it, 
        typename ListIterator<ValueType>::difference_type n
    )
{
    it -= n; return it;
}

} // end namespace Impl


/// Vuforia's List container
/**
 *  This class offers similar capabilities to std::list and implements a subset of 
 *  its functionality. The type 'ValueType' needs to be a Vuforia data type.
 *
 *  Here is an example on how to use it:
 *      Vuforia::List<const HitTesResult> hitTestResult = smartTerrain.hitTest(...)
 */
template <typename ValueType>
class List
{
public:

    /// Standard C++ boilerplate typedefs
    typedef Impl::ListIterator<ValueType> iterator;
    typedef iterator const_iterator;
    typedef int size_type;
    typedef typename iterator::value_type value_type;
    typedef typename iterator::reference reference;
    typedef typename iterator::const_reference const_reference;
    typedef typename iterator::difference_type difference_type;

    /// Copy constructor, assignment and destructor are reference counted,
    /// therefore it's OK to copy a List, it won't copy the contents. Vuforia
    /// might give additional lifetime constraints, e.g. Lists only being valid
    /// for a single frame.
    List(List const& other) 
    {
        provider = other.provider->acquire();
    }
    List& operator=(List const& other)
    {
        if (this == &other)
            return *this;

        provider->release();
        provider = other.provider->acquire();
        return *this;
    }
    ~List()
    {
        provider->release();
    }

    /// Returns an iterator pointing to the first element in the list
    iterator begin() const { return iterator(provider, 0); }

    /// Returns an iterator pointing to the last element in the list
    iterator end()   const { return iterator(provider, provider->size()); }

    /// Functions returning the list element at position 'pos' in the list
    ValueType* operator[](int pos) const { return provider->getItem(pos); }
    ValueType* at(int pos) const { return provider->getItem(pos); }

    /// Returns a read-only view of the list
    List<const ValueType> constView()
    {
        return List<const ValueType>(provider->constView());
    }

    /// Number of elements in list
    int size() const { return provider->size(); }

    /// Returns true if the list is empty, false otherwise
    bool empty() const { return provider->size() == 0; }

protected:

    List(ListDataProvider<ValueType>* provider_) : provider(provider_->acquire()) {}
    mutable ListDataProvider<ValueType>* provider;
    template <typename T>
    friend class List;
};

} // namespace Vuforia

#endif //_VUFORIA_LIST_H_
