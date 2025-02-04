/*
 * Copyright (C) 2008 Apple Inc. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include "config.h"
#include "core/svg/animation/SMILTimeContainer.h"

#include "core/dom/ElementTraversal.h"
#include "core/svg/SVGSVGElement.h"
#include "core/svg/animation/SVGSMILElement.h"
#include "wtf/CurrentTime.h"

using namespace std;

namespace WebCore {

static const double animationFrameDelay = 0.025;

SMILTimeContainer::SMILTimeContainer(SVGSVGElement* owner)
    : m_beginTime(0)
    , m_pauseTime(0)
    , m_resumeTime(0)
    , m_accumulatedActiveTime(0)
    , m_presetStartTime(0)
    , m_documentOrderIndexesDirty(false)
    , m_timer(this, &SMILTimeContainer::timerFired)
    , m_ownerSVGElement(owner)
#ifndef NDEBUG
    , m_preventScheduledAnimationsChanges(false)
#endif
{
}

SMILTimeContainer::~SMILTimeContainer()
{
    cancelAnimationFrame();
    ASSERT(!m_timer.isActive());
#ifndef NDEBUG
    ASSERT(!m_preventScheduledAnimationsChanges);
#endif
}

void SMILTimeContainer::schedule(SVGSMILElement* animation, SVGElement* target, const QualifiedName& attributeName)
{
    ASSERT(animation->timeContainer() == this);
    ASSERT(target);
    ASSERT(animation->hasValidAttributeName());

#ifndef NDEBUG
    ASSERT(!m_preventScheduledAnimationsChanges);
#endif

    ElementAttributePair key(target, attributeName);
    OwnPtr<AnimationsVector>& scheduled = m_scheduledAnimations.add(key, nullptr).storedValue->value;
    if (!scheduled)
        scheduled = adoptPtr(new AnimationsVector);
    ASSERT(!scheduled->contains(animation));
    scheduled->append(animation);

    SMILTime nextFireTime = animation->nextProgressTime();
    if (nextFireTime.isFinite())
        notifyIntervalsChanged();
}

void SMILTimeContainer::unschedule(SVGSMILElement* animation, SVGElement* target, const QualifiedName& attributeName)
{
    ASSERT(animation->timeContainer() == this);

#ifndef NDEBUG
    ASSERT(!m_preventScheduledAnimationsChanges);
#endif

    ElementAttributePair key(target, attributeName);
    AnimationsVector* scheduled = m_scheduledAnimations.get(key);
    ASSERT(scheduled);
    size_t idx = scheduled->find(animation);
    ASSERT(idx != kNotFound);
    scheduled->remove(idx);
}

void SMILTimeContainer::notifyIntervalsChanged()
{
    // Schedule updateAnimations() to be called asynchronously so multiple intervals
    // can change with updateAnimations() only called once at the end.
    scheduleAnimationFrame();
}

SMILTime SMILTimeContainer::elapsed() const
{
    if (!m_beginTime)
        return 0;

    if (isPaused())
        return m_accumulatedActiveTime;

    return currentTime() + m_accumulatedActiveTime - lastResumeTime();
}

bool SMILTimeContainer::isPaused() const
{
    return m_pauseTime;
}

bool SMILTimeContainer::isStarted() const
{
    return m_beginTime;
}

void SMILTimeContainer::begin()
{
    ASSERT(!m_beginTime);
    double now = currentTime();

    // If 'm_presetStartTime' is set, the timeline was modified via setElapsed() before the document began.
    // In this case pass on 'seekToTime=true' to updateAnimations().
    m_beginTime = now - m_presetStartTime;
    updateAnimations(SMILTime(m_presetStartTime), m_presetStartTime ? true : false);
    m_presetStartTime = 0;

    if (m_pauseTime) {
        m_pauseTime = now;
        cancelAnimationFrame();
    }
}

void SMILTimeContainer::pause()
{
    ASSERT(!isPaused());
    m_pauseTime = currentTime();

    if (m_beginTime) {
        m_accumulatedActiveTime += m_pauseTime - lastResumeTime();
        cancelAnimationFrame();
    }
    m_resumeTime = 0;
}

void SMILTimeContainer::resume()
{
    ASSERT(isPaused());
    m_resumeTime = currentTime();

    m_pauseTime = 0;
    scheduleAnimationFrame();
}

void SMILTimeContainer::setElapsed(SMILTime time)
{
    // If the documment didn't begin yet, record a new start time, we'll seek to once its possible.
    if (!m_beginTime) {
        m_presetStartTime = time.value();
        return;
    }

    if (m_beginTime)
        cancelAnimationFrame();

    double now = currentTime();
    m_beginTime = now - time.value();
    m_resumeTime = 0;
    if (m_pauseTime) {
        m_pauseTime = now;
        m_accumulatedActiveTime = time.value();
    } else {
        m_accumulatedActiveTime = 0;
    }

#ifndef NDEBUG
    m_preventScheduledAnimationsChanges = true;
#endif
    GroupedAnimationsMap::iterator end = m_scheduledAnimations.end();
    for (GroupedAnimationsMap::iterator it = m_scheduledAnimations.begin(); it != end; ++it) {
        AnimationsVector* scheduled = it->value.get();
        unsigned size = scheduled->size();
        for (unsigned n = 0; n < size; n++)
            scheduled->at(n)->reset();
    }
#ifndef NDEBUG
    m_preventScheduledAnimationsChanges = false;
#endif

    updateAnimations(time, true);
}

bool SMILTimeContainer::isTimelineRunning() const
{
    return m_beginTime && !isPaused();
}

void SMILTimeContainer::scheduleAnimationFrame(SMILTime fireTime)
{
    if (!isTimelineRunning())
        return;

    if (!fireTime.isFinite())
        return;

    SMILTime delay = max(fireTime - elapsed(), SMILTime(animationFrameDelay));
    m_timer.startOneShot(delay.value());
}

void SMILTimeContainer::scheduleAnimationFrame()
{
    if (!isTimelineRunning())
        return;

    m_timer.startOneShot(0);
}

void SMILTimeContainer::cancelAnimationFrame()
{
    m_timer.stop();
}

void SMILTimeContainer::timerFired(Timer<SMILTimeContainer>*)
{
    ASSERT(isTimelineRunning());
    updateAnimations(elapsed());
}

void SMILTimeContainer::updateDocumentOrderIndexes()
{
    unsigned timingElementCount = 0;
    for (Element* element = m_ownerSVGElement; element; element = ElementTraversal::next(*element, m_ownerSVGElement)) {
        if (isSVGSMILElement(*element))
            toSVGSMILElement(element)->setDocumentOrderIndex(timingElementCount++);
    }
    m_documentOrderIndexesDirty = false;
}

struct PriorityCompare {
    PriorityCompare(SMILTime elapsed) : m_elapsed(elapsed) {}
    bool operator()(const RefPtr<SVGSMILElement>& a, const RefPtr<SVGSMILElement>& b)
    {
        // FIXME: This should also consider possible timing relations between the elements.
        SMILTime aBegin = a->intervalBegin();
        SMILTime bBegin = b->intervalBegin();
        // Frozen elements need to be prioritized based on their previous interval.
        aBegin = a->isFrozen() && m_elapsed < aBegin ? a->previousIntervalBegin() : aBegin;
        bBegin = b->isFrozen() && m_elapsed < bBegin ? b->previousIntervalBegin() : bBegin;
        if (aBegin == bBegin)
            return a->documentOrderIndex() < b->documentOrderIndex();
        return aBegin < bBegin;
    }
    SMILTime m_elapsed;
};

void SMILTimeContainer::updateAnimations(SMILTime elapsed, bool seekToTime)
{
    SMILTime earliestFireTime = SMILTime::unresolved();

#ifndef NDEBUG
    // This boolean will catch any attempts to schedule/unschedule scheduledAnimations during this critical section.
    // Similarly, any elements removed will unschedule themselves, so this will catch modification of animationsToApply.
    m_preventScheduledAnimationsChanges = true;
#endif

    if (m_documentOrderIndexesDirty)
        updateDocumentOrderIndexes();

    Vector<RefPtr<SVGSMILElement> >  animationsToApply;
    GroupedAnimationsMap::iterator end = m_scheduledAnimations.end();
    for (GroupedAnimationsMap::iterator it = m_scheduledAnimations.begin(); it != end; ++it) {
        AnimationsVector* scheduled = it->value.get();

        // Sort according to priority. Elements with later begin time have higher priority.
        // In case of a tie, document order decides.
        // FIXME: This should also consider timing relationships between the elements. Dependents
        // have higher priority.
        std::sort(scheduled->begin(), scheduled->end(), PriorityCompare(elapsed));

        SVGSMILElement* resultElement = 0;
        unsigned size = scheduled->size();
        for (unsigned n = 0; n < size; n++) {
            SVGSMILElement* animation = scheduled->at(n);
            ASSERT(animation->timeContainer() == this);
            ASSERT(animation->targetElement());
            ASSERT(animation->hasValidAttributeName());

            // Results are accumulated to the first animation that animates and contributes to a particular element/attribute pair.
            // FIXME: we should ensure that resultElement is of an appropriate type.
            if (!resultElement) {
                if (!animation->hasValidAttributeType())
                    continue;
                resultElement = animation;
            }

            // This will calculate the contribution from the animation and add it to the resultsElement.
            if (!animation->progress(elapsed, resultElement, seekToTime) && resultElement == animation)
                resultElement = 0;

            SMILTime nextFireTime = animation->nextProgressTime();
            if (nextFireTime.isFinite())
                earliestFireTime = min(nextFireTime, earliestFireTime);
        }

        if (resultElement)
            animationsToApply.append(resultElement);
    }

    std::sort(animationsToApply.begin(), animationsToApply.end(), PriorityCompare(elapsed));

    unsigned animationsToApplySize = animationsToApply.size();
    if (!animationsToApplySize) {
#ifndef NDEBUG
        m_preventScheduledAnimationsChanges = false;
#endif
        scheduleAnimationFrame(earliestFireTime);
        return;
    }

    // Apply results to target elements.
    for (unsigned i = 0; i < animationsToApplySize; ++i)
        animationsToApply[i]->applyResultsToTarget();

#ifndef NDEBUG
    m_preventScheduledAnimationsChanges = false;
#endif

    scheduleAnimationFrame(earliestFireTime);

    for (unsigned i = 0; i < animationsToApplySize; ++i) {
        if (animationsToApply[i]->inDocument() && animationsToApply[i]->isSVGDiscardElement()) {
            RefPtr<SVGSMILElement> animDiscard = animationsToApply[i];
            RefPtr<SVGElement> targetElement = animDiscard->targetElement();
            if (targetElement && targetElement->inDocument()) {
                targetElement->remove(IGNORE_EXCEPTION);
                ASSERT(!targetElement->inDocument());
            }

            if (animDiscard->inDocument()) {
                animDiscard->remove(IGNORE_EXCEPTION);
                ASSERT(!animDiscard->inDocument());
            }
        }
    }
}

}
