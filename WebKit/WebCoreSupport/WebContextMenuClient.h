/*
 * Copyright (C) 2006 Apple Computer, Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer. 
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution. 
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#import <WebCore/ContextMenuClient.h>
#import <WebCore/Shared.h>
#import <wtf/Forward.h>

@class WebView;

class WebContextMenuClient : public WebCore::ContextMenuClient, public WebCore::Shared<WebContextMenuClient> {
public:
    static PassRefPtr<WebContextMenuClient> create(WebView *webView);
    
    virtual void ref();
    virtual void deref();
    
    virtual void addCustomContextMenuItems(WebCore::ContextMenu* menu);
    
    virtual void copyLinkToClipboard(WebCore::HitTestResult);
    virtual void downloadURL(WebCore::KURL url);
    virtual void copyImageToClipboard(WebCore::HitTestResult);
    virtual void searchWithSpotlight();
    virtual void lookUpInDictionary(WebCore::Frame*);

    WebView *webView() { return m_webView; }
        
private:
    WebContextMenuClient(WebView *webView);
    
    WebView *m_webView;
};
