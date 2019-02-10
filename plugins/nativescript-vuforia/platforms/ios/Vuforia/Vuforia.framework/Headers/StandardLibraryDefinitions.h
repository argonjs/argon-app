/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    StandardLibraryDefinitions.h

@brief
    Header to include in order to use Vuforia data structures with standard
    library algorithms
===============================================================================*/

#ifndef _VUFORIA_STANDARDLIBRARYDEFINITIONS_H_
#define _VUFORIA_STANDARDLIBRARYDEFINITIONS_H_

// Include files
#include <Vuforia/List.h>
#include <iterator>

namespace std
{
    /// Specialization of std::iterator_traits\<T\> for Vuforia::List iterators
    /**
     *  By specializing iterator_traits for Vuforia::List iterators, you can use
     *  Vuforia::List with standard library algorithms. For example, if you have a 
     *  Vuforia::List\<Vuforia::Trackable\> and you want to see if the list
     *  contains a Trackable with a given name, after including this header and
     *  \<algorithm\> you can use (in C++11)
     *
     *  <PRE>
     *  std::string name = "stones";
     *  if (std::any_of(
     *         list.begin(), list.end(),
     *         [&](Vuforia::Trackable const* t) {
     *             return t->getName() == name; 
     *         })
     *  ) {
     *      // ...
     *  }
     *  </PRE>
     */
    template <typename ValueType>
    struct iterator_traits< Vuforia::Impl::ListIterator<ValueType> >
    {
        typedef int difference_type;
        typedef ValueType* value_type;
        typedef ValueType** pointer;
        typedef ValueType*& reference;
        typedef random_access_iterator_tag iterator_category;
    };
}

#endif
