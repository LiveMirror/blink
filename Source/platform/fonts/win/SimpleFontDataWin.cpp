/*
 * Copyright (C) 2006, 2007 Apple Inc. All Rights Reserved.
 * Copyright (c) 2008, 2009, Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include "config.h"
#include "platform/fonts/SimpleFontData.h"

#include <mlang.h>
#include <objidl.h>
#include <unicode/uchar.h>
#include <unicode/unorm.h>
#include "platform/fonts/FontCache.h"
#include "platform/fonts/FontDescription.h"
#include "platform/fonts/win/FontPlatformDataWin.h"
#include "platform/geometry/FloatRect.h"
#include "platform/win/HWndDC.h"
#include "wtf/MathExtras.h"

namespace WebCore {

void SimpleFontData::platformInit()
{
    if (!m_platformData.size()) {
        m_fontMetrics.reset();
        m_avgCharWidth = 0;
        m_maxCharWidth = 0;
        return;
    }

    HWndDC dc(0);
    HGDIOBJ oldFont = SelectObject(dc, m_platformData.hfont());

    TEXTMETRIC textMetric = {0};
    if (!GetTextMetrics(dc, &textMetric)) {
        if (FontPlatformData::ensureFontLoaded(m_platformData.hfont())) {
            // Retry GetTextMetrics.
            // FIXME: Handle gracefully the error if this call also fails.
            // See http://crbug.com/6401.
            if (!GetTextMetrics(dc, &textMetric))
                WTF_LOG_ERROR("Unable to get the text metrics after second attempt");
        }
    }

    m_avgCharWidth = textMetric.tmAveCharWidth;
    m_maxCharWidth = textMetric.tmMaxCharWidth;

    // FIXME: Access ascent/descent/lineGap with floating point precision.
    float ascent = textMetric.tmAscent;
    float descent = textMetric.tmDescent;
    float lineGap = textMetric.tmExternalLeading;
    float xHeight = ascent * 0.56f; // Best guess for xHeight for non-Truetype fonts.

    OUTLINETEXTMETRIC outlineTextMetric;
    if (GetOutlineTextMetrics(dc, sizeof(outlineTextMetric), &outlineTextMetric) > 0) {
        m_fontMetrics.setUnitsPerEm(outlineTextMetric.otmEMSquare);

        // This is a TrueType font.  We might be able to get an accurate xHeight.
        GLYPHMETRICS glyphMetrics = {0};
        MAT2 identityMatrix = {{0, 1}, {0, 0}, {0, 0}, {0, 1}};
        DWORD len = GetGlyphOutlineW(dc, 'x', GGO_METRICS, &glyphMetrics, 0, 0, &identityMatrix);
        if (len != GDI_ERROR && glyphMetrics.gmBlackBoxY > 0)
            xHeight = static_cast<float>(glyphMetrics.gmBlackBoxY);
    }

    m_fontMetrics.setAscent(ascent);
    m_fontMetrics.setDescent(descent);
    m_fontMetrics.setLineGap(lineGap);
    m_fontMetrics.setXHeight(xHeight);
    m_fontMetrics.setLineSpacing(ascent + descent + lineGap);

    SelectObject(dc, oldFont);
}

void SimpleFontData::platformCharWidthInit()
{
    // charwidths are set in platformInit.
}

void SimpleFontData::platformDestroy()
{
}

PassRefPtr<SimpleFontData> SimpleFontData::platformCreateScaledFontData(const FontDescription& fontDescription, float scaleFactor) const
{
    LOGFONT winFont;
    GetObject(m_platformData.hfont(), sizeof(LOGFONT), &winFont);
    float scaledSize = scaleFactor * fontDescription.computedSize();
    winFont.lfHeight = -lroundf(scaledSize);
    HFONT hfont = CreateFontIndirect(&winFont);
    return SimpleFontData::create(FontPlatformData(hfont, scaledSize, m_platformData.orientation()), isCustomFont() ? CustomFontData::create(false) : 0);
}

void SimpleFontData::determinePitch()
{
    m_treatAsFixedPitch = platformData().isFixedPitch();
}

FloatRect SimpleFontData::platformBoundsForGlyph(Glyph glyph) const
{
    HWndDC hdc(0);
    SetGraphicsMode(hdc, GM_ADVANCED);
    HGDIOBJ oldFont = SelectObject(hdc, m_platformData.hfont());

    GLYPHMETRICS gdiMetrics;
    static const MAT2 identity = { 0, 1,  0, 0,  0, 0,  0, 1 };
    if (GetGlyphOutline(hdc, glyph, GGO_METRICS | GGO_GLYPH_INDEX, &gdiMetrics, 0, 0, &identity) == -1) {
        if (FontPlatformData::ensureFontLoaded(m_platformData.hfont())) {
            // Retry GetTextMetrics.
            // FIXME: Handle gracefully the error if this call also fails.
            // See http://crbug.com/6401.
            if (GetGlyphOutline(hdc, glyph, GGO_METRICS | GGO_GLYPH_INDEX, &gdiMetrics, 0, 0, &identity) == -1)
                WTF_LOG_ERROR("Unable to get the glyph metrics after second attempt");
        }
    }

    SelectObject(hdc, oldFont);

    return FloatRect(gdiMetrics.gmptGlyphOrigin.x, -gdiMetrics.gmptGlyphOrigin.y,
        gdiMetrics.gmBlackBoxX, gdiMetrics.gmBlackBoxY);
}

float SimpleFontData::platformWidthForGlyph(Glyph glyph) const
{
    if (!m_platformData.size())
        return 0;

    HWndDC dc(0);
    HGDIOBJ oldFont = SelectObject(dc, m_platformData.hfont());

    int width = 0;
    if (!GetCharWidthI(dc, glyph, 1, 0, &width)) {
        // Ask the browser to preload the font and retry.
        if (FontPlatformData::ensureFontLoaded(m_platformData.hfont())) {
            // FIXME: Handle gracefully the error if this call also fails.
            // See http://crbug.com/6401.
            if (!GetCharWidthI(dc, glyph, 1, 0, &width))
                WTF_LOG_ERROR("Unable to get the char width after second attempt");
        }
    }

    SelectObject(dc, oldFont);

    return static_cast<float>(width);
}

}  // namespace WebCore
