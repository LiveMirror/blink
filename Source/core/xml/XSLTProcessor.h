/*
 * This file is part of the XSL implementation.
 *
 * Copyright (C) 2004, 2007, 2008 Apple, Inc. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Library General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Library General Public License for more details.
 *
 * You should have received a copy of the GNU Library General Public License
 * along with this library; see the file COPYING.LIB.  If not, write to
 * the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
 * Boston, MA 02110-1301, USA.
 *
 */

#ifndef XSLTProcessor_h
#define XSLTProcessor_h

#include "RuntimeEnabledFeatures.h"
#include "bindings/v8/ScriptWrappable.h"
#include "core/dom/Node.h"
#include "core/xml/XSLStyleSheet.h"
#include "wtf/HashMap.h"
#include "wtf/text/StringHash.h"

#include <libxml/parserInternals.h>
#include <libxslt/documents.h>

namespace WebCore {

class Frame;
class Document;
class DocumentFragment;

class XSLTProcessor : public RefCountedWillBeGarbageCollectedFinalized<XSLTProcessor>, public ScriptWrappable {
    DECLARE_GC_INFO;
public:
    static PassRefPtrWillBeRawPtr<XSLTProcessor> create()
    {
        ASSERT(RuntimeEnabledFeatures::xsltEnabled());
        return adoptRefWillBeNoop(new XSLTProcessor);
    }
    ~XSLTProcessor();

    void setXSLStyleSheet(PassRefPtr<XSLStyleSheet> styleSheet) { m_stylesheet = styleSheet; }
    bool transformToString(Node* source, String& resultMIMEType, String& resultString, String& resultEncoding);
    PassRefPtr<Document> createDocumentFromSource(const String& source, const String& sourceEncoding, const String& sourceMIMEType, Node* sourceNode, Frame* frame);

    // DOM methods
    void importStylesheet(PassRefPtr<Node> style)
    {
        if (style)
            m_stylesheetRootNode = style;
    }
    PassRefPtr<DocumentFragment> transformToFragment(Node* source, Document* ouputDoc);
    PassRefPtr<Document> transformToDocument(Node* source);

    void setParameter(const String& namespaceURI, const String& localName, const String& value);
    String getParameter(const String& namespaceURI, const String& localName) const;
    void removeParameter(const String& namespaceURI, const String& localName);
    void clearParameters() { m_parameters.clear(); }

    void reset();

    static void parseErrorFunc(void* userData, xmlError*);
    static void genericErrorFunc(void* userData, const char* msg, ...);

    // Only for libXSLT callbacks
    XSLStyleSheet* xslStylesheet() const { return m_stylesheet.get(); }

    typedef HashMap<String, String> ParameterMap;

    void trace(Visitor*) { }

private:
    XSLTProcessor()
    {
        ScriptWrappable::init(this);
    }

    RefPtr<XSLStyleSheet> m_stylesheet;
    RefPtr<Node> m_stylesheetRootNode;
    ParameterMap m_parameters;
};

}

#endif
