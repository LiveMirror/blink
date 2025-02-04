/*
 * Copyright (C) 2004, 2006, 2009 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE COMPUTER, INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE COMPUTER, INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#ifndef TextIterator_h
#define TextIterator_h

#include "core/dom/Range.h"
#include "core/editing/FindOptions.h"
#include "wtf/Vector.h"

namespace WebCore {

class InlineTextBox;
class RenderText;
class RenderTextFragment;

enum TextIteratorBehavior {
    TextIteratorDefaultBehavior = 0,
    TextIteratorEmitsCharactersBetweenAllVisiblePositions = 1 << 0,
    TextIteratorEntersTextControls = 1 << 1,
    TextIteratorIgnoresStyleVisibility = 1 << 2,
    TextIteratorEmitsOriginalText = 1 << 3,
    TextIteratorStopsOnFormControls = 1 << 4,
    TextIteratorEmitsImageAltText = 1 << 5,
    TextIteratorEntersAuthorShadowRoots = 1 << 6
};
typedef unsigned TextIteratorBehaviorFlags;

// FIXME: Can't really answer this question correctly without knowing the white-space mode.
// FIXME: Move this somewhere else in the editing directory. It doesn't belong here.
inline bool isCollapsibleWhitespace(UChar c)
{
    switch (c) {
        case ' ':
        case '\n':
            return true;
        default:
            return false;
    }
}

String plainText(const Range*, TextIteratorBehaviorFlags = TextIteratorDefaultBehavior);
PassRefPtr<Range> findPlainText(const Range*, const String&, FindOptions);

class BitStack {
public:
    BitStack();
    ~BitStack();

    void push(bool);
    void pop();

    bool top() const;
    unsigned size() const;

private:
    unsigned m_size;
    Vector<unsigned, 1> m_words;
};

// Iterates through the DOM range, returning all the text, and 0-length boundaries
// at points where replaced elements break up the text flow.  The text comes back in
// chunks so as to optimize for performance of the iteration.

class TextIterator {
public:
    explicit TextIterator(const Range*, TextIteratorBehaviorFlags = TextIteratorDefaultBehavior);
    ~TextIterator();

    bool atEnd() const { return !m_positionNode || m_shouldStop; }
    void advance();

    int length() const { return m_textLength; }
    UChar characterAt(unsigned index) const;
    String substring(unsigned position, unsigned length) const;
    void appendTextToStringBuilder(StringBuilder&, unsigned position = 0, unsigned maxLength = UINT_MAX) const;

    template<typename BufferType>
    void appendTextTo(BufferType& output, unsigned position = 0)
    {
        ASSERT_WITH_SECURITY_IMPLICATION(position <= static_cast<unsigned>(length()));
        unsigned lengthToAppend = length() - position;
        if (!lengthToAppend)
            return;
        if (m_singleCharacterBuffer) {
            ASSERT(!position);
            ASSERT(length() == 1);
            output.append(&m_singleCharacterBuffer, 1);
        } else {
            string().appendTo(output, startOffset() + position, lengthToAppend);
        }
    }

    PassRefPtr<Range> range() const;
    Node* node() const;

    static int rangeLength(const Range*, bool spacesForReplacedElements = false);
    static PassRefPtr<Range> subrange(Range* entireRange, int characterOffset, int characterCount);

private:
    enum IterationProgress {
        HandledNone,
        HandledAuthorShadowRoots,
        HandledUserAgentShadowRoot,
        HandledNode,
        HandledChildren
    };

    int startOffset() const { return m_positionStartOffset; }
    const String& string() const { return m_text; }
    void exitNode();
    bool shouldRepresentNodeOffsetZero();
    bool shouldEmitSpaceBeforeAndAfterNode(Node*);
    void representNodeOffsetZero();
    bool handleTextNode();
    bool handleReplacedElement();
    bool handleNonTextNode();
    void handleTextBox();
    void handleTextNodeFirstLetter(RenderTextFragment*);
    bool hasVisibleTextNode(RenderText*);
    void emitCharacter(UChar, Node* textNode, Node* offsetBaseNode, int textStartOffset, int textEndOffset);
    void emitText(Node* textNode, RenderObject* renderObject, int textStartOffset, int textEndOffset);
    void emitText(Node* textNode, int textStartOffset, int textEndOffset);

    // Current position, not necessarily of the text being returned, but position
    // as we walk through the DOM tree.
    Node* m_node;
    int m_offset;
    IterationProgress m_iterationProgress;
    BitStack m_fullyClippedStack;
    int m_shadowDepth;

    // The range.
    Node* m_startContainer;
    int m_startOffset;
    Node* m_endContainer;
    int m_endOffset;
    Node* m_pastEndNode;

    // The current text and its position, in the form to be returned from the iterator.
    Node* m_positionNode;
    mutable Node* m_positionOffsetBaseNode;
    mutable int m_positionStartOffset;
    mutable int m_positionEndOffset;
    int m_textLength;
    String m_text;

    // Used when there is still some pending text from the current node; when these
    // are false and 0, we go back to normal iterating.
    bool m_needsAnotherNewline;
    InlineTextBox* m_textBox;
    // Used when iteration over :first-letter text to save pointer to
    // remaining text box.
    InlineTextBox* m_remainingTextBox;
    // Used to point to RenderText object for :first-letter.
    RenderText *m_firstLetterText;

    // Used to do the whitespace collapsing logic.
    Node* m_lastTextNode;
    bool m_lastTextNodeEndedWithCollapsedSpace;
    UChar m_lastCharacter;

    // Used for whitespace characters that aren't in the DOM, so we can point at them.
    // If non-zero, overrides m_text.
    UChar m_singleCharacterBuffer;

    // Used when text boxes are out of order (Hebrew/Arabic w/ embeded LTR text)
    Vector<InlineTextBox*> m_sortedTextBoxes;
    size_t m_sortedTextBoxesPosition;

    // Used when deciding whether to emit a "positioning" (e.g. newline) before any other content
    bool m_hasEmitted;

    // Used by selection preservation code.  There should be one character emitted between every VisiblePosition
    // in the Range used to create the TextIterator.
    // FIXME <rdar://problem/6028818>: This functionality should eventually be phased out when we rewrite
    // moveParagraphs to not clone/destroy moved content.
    bool m_emitsCharactersBetweenAllVisiblePositions;
    bool m_entersTextControls;

    // Used in pasting inside password field.
    bool m_emitsOriginalText;
    // Used when deciding text fragment created by :first-letter should be looked into.
    bool m_handledFirstLetter;
    // Used when the visibility of the style should not affect text gathering.
    bool m_ignoresStyleVisibility;
    // Used when the iteration should stop if form controls are reached.
    bool m_stopsOnFormControls;
    // Used when m_stopsOnFormControls is set to determine if the iterator should keep advancing.
    bool m_shouldStop;

    bool m_emitsImageAltText;

    bool m_entersAuthorShadowRoots;
};

// Iterates through the DOM range, returning all the text, and 0-length boundaries
// at points where replaced elements break up the text flow. The text comes back in
// chunks so as to optimize for performance of the iteration.
class SimplifiedBackwardsTextIterator {
public:
    explicit SimplifiedBackwardsTextIterator(const Range*, TextIteratorBehaviorFlags = TextIteratorDefaultBehavior);

    bool atEnd() const { return !m_positionNode || m_shouldStop; }
    void advance();

    int length() const { return m_textLength; }

    Node* node() const { return m_node; }

    template<typename BufferType>
    void prependTextTo(BufferType& output)
    {
        if (!m_textLength)
            return;
        if (m_singleCharacterBuffer)
            output.prepend(&m_singleCharacterBuffer, 1);
        else
            m_textContainer.prependTo(output, m_textOffset, m_textLength);
    }

    PassRefPtr<Range> range() const;

private:
    void exitNode();
    bool handleTextNode();
    RenderText* handleFirstLetter(int& startOffset, int& offsetInNode);
    bool handleReplacedElement();
    bool handleNonTextNode();
    void emitCharacter(UChar, Node*, int startOffset, int endOffset);
    bool advanceRespectingRange(Node*);

    // Current position, not necessarily of the text being returned, but position
    // as we walk through the DOM tree.
    Node* m_node;
    int m_offset;
    bool m_handledNode;
    bool m_handledChildren;
    BitStack m_fullyClippedStack;

    // End of the range.
    Node* m_startNode;
    int m_startOffset;
    // Start of the range.
    Node* m_endNode;
    int m_endOffset;

    // The current text and its position, in the form to be returned from the iterator.
    Node* m_positionNode;
    int m_positionStartOffset;
    int m_positionEndOffset;

    String m_textContainer; // We're interested in the range [m_textOffset, m_textOffset + m_textLength) of m_textContainer.
    int m_textOffset;
    int m_textLength;

    // Used to do the whitespace logic.
    Node* m_lastTextNode;
    UChar m_lastCharacter;

    // Used for whitespace characters that aren't in the DOM, so we can point at them.
    UChar m_singleCharacterBuffer;

    // Whether m_node has advanced beyond the iteration range (i.e. m_startNode).
    bool m_havePassedStartNode;

    // Should handle first-letter renderer in the next call to handleTextNode.
    bool m_shouldHandleFirstLetter;

    // Used when the iteration should stop if form controls are reached.
    bool m_stopsOnFormControls;

    // Used when m_stopsOnFormControls is set to determine if the iterator should keep advancing.
    bool m_shouldStop;

    // Used in pasting inside password field.
    bool m_emitsOriginalText;
};

// Builds on the text iterator, adding a character position so we can walk one
// character at a time, or faster, as needed. Useful for searching.
class CharacterIterator {
public:
    explicit CharacterIterator(const Range*, TextIteratorBehaviorFlags = TextIteratorDefaultBehavior);

    void advance(int numCharacters);

    bool atBreak() const { return m_atBreak; }
    bool atEnd() const { return m_textIterator.atEnd(); }

    int length() const { return m_textIterator.length() - m_runOffset; }
    UChar characterAt(unsigned index) const { return m_textIterator.characterAt(m_runOffset + index); }

    template<typename BufferType>
    void appendTextTo(BufferType& output) { m_textIterator.appendTextTo(output, m_runOffset); }

    int characterOffset() const { return m_offset; }
    PassRefPtr<Range> range() const;

private:
    int m_offset;
    int m_runOffset;
    bool m_atBreak;

    TextIterator m_textIterator;
};

class BackwardsCharacterIterator {
public:
    explicit BackwardsCharacterIterator(const Range*, TextIteratorBehaviorFlags = TextIteratorDefaultBehavior);

    void advance(int);

    bool atEnd() const { return m_textIterator.atEnd(); }

    PassRefPtr<Range> range() const;

private:
    int m_offset;
    int m_runOffset;
    bool m_atBreak;

    SimplifiedBackwardsTextIterator m_textIterator;
};

// Very similar to the TextIterator, except that the chunks of text returned are "well behaved",
// meaning they never end split up a word.  This is useful for spellcheck or (perhaps one day) searching.
class WordAwareIterator {
public:
    explicit WordAwareIterator(const Range*);
    ~WordAwareIterator();

    bool atEnd() const { return !m_didLookAhead && m_textIterator.atEnd(); }
    void advance();

    String substring(unsigned position, unsigned length) const;
    UChar characterAt(unsigned index) const;
    int length() const;

private:
    Vector<UChar> m_buffer;
    // Did we have to look ahead in the textIterator to confirm the current chunk?
    bool m_didLookAhead;
    RefPtr<Range> m_range;
    TextIterator m_textIterator;
};

}

#endif
