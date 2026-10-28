import { DomainError } from "./errors.js";
import { mergeSort } from "./sorting.js";

function parseIsoDate(value, fieldName) {
    if (typeof value !== "string") {
        throw new DomainError(`${fieldName} must be a valid ISO date`, "VALIDATION");
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/.exec(value);
    const timestamp = Date.parse(value);

    if (!match || !Number.isFinite(timestamp)) {
        throw new DomainError(`${fieldName} must be a valid ISO date`, "VALIDATION");
    }

    const [, year, month, day] = match;
    const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

    if (calendarDate.getUTCFullYear() !== Number(year)
        || calendarDate.getUTCMonth() !== Number(month) - 1
        || calendarDate.getUTCDate() !== Number(day)) {
        throw new DomainError(`${fieldName} must be a valid ISO date`, "VALIDATION");
    }

    return timestamp;
}

function eventTiers(event) {
    if (Array.isArray(event.tiers)) {
        return event.tiers;
    }

    if (event.tiers instanceof Map) {
        return [...event.tiers.values()];
    }

    return [];
}

function cheapestPrice(event) {
    const prices = eventTiers(event)
        .map(tier => tier.priceCents)
        .filter(price => Number.isSafeInteger(price) && price >= 0);

    return prices.length === 0 ? undefined : Math.min(...prices);
}

function availableSeats(event) {
    return eventTiers(event).reduce((total, tier) => {
        if (Number.isFinite(tier.seatsLeft)) {
            return total + tier.seatsLeft;
        }

        if (Number.isFinite(tier.capacity) && Number.isFinite(tier.sold)) {
            return total + tier.capacity - tier.sold;
        }

        return total;
    }, 0);
}

function compareValues(left, right) {
    if (left < right) {
        return -1;
    }

    if (left > right) {
        return 1;
    }

    return 0;
}

function compareText(left, right) {
    return compareValues(String(left ?? ""), String(right ?? ""));
}

function compareTitleAndId(left, right) {
    return compareText(left.title ?? left.name, right.title ?? right.name)
        || compareText(left.id, right.id);
}

function dateSortKey(event) {
    return Number.isFinite(Date.parse(event.date))
        ? String(event.date).slice(0, 10)
        : undefined;
}

export function filterEvents(summaries, {
    q,
    city,
    from,
    to,
    maxPriceCents,
    onlyAvailable
} = {}) {
    const fromTimestamp = from === undefined ? undefined : parseIsoDate(from, "from");
    let toTimestamp = to === undefined ? undefined : parseIsoDate(to, "to");

    if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toTimestamp += 24 * 60 * 60 * 1000 - 1;
    }

    if (maxPriceCents !== undefined
        && (!Number.isSafeInteger(maxPriceCents) || maxPriceCents < 0)) {
        throw new DomainError("Maximum price must be a non-negative whole number", "VALIDATION");
    }

    const normalizedQuery = typeof q === "string" ? q.toLowerCase() : undefined;
    const normalizedCity = typeof city === "string" ? city.toLowerCase() : undefined;

    return summaries.filter(event => {
        const title = String(event.title ?? event.name ?? "").toLowerCase();
        const venue = String(event.venue ?? "").toLowerCase();

        if (normalizedQuery && !title.includes(normalizedQuery) && !venue.includes(normalizedQuery)) {
            return false;
        }

        if (normalizedCity !== undefined
            && String(event.city ?? "").toLowerCase() !== normalizedCity) {
            return false;
        }

        if (fromTimestamp !== undefined || toTimestamp !== undefined) {
            const eventTimestamp = Date.parse(event.date);

            if (!Number.isFinite(eventTimestamp)
                || (fromTimestamp !== undefined && eventTimestamp < fromTimestamp)
                || (toTimestamp !== undefined && eventTimestamp > toTimestamp)) {
                return false;
            }
        }

        if (maxPriceCents !== undefined) {
            const price = cheapestPrice(event);

            if (price === undefined || price > maxPriceCents) {
                return false;
            }
        }

        return !onlyAvailable || availableSeats(event) > 0;
    });
}

export function sortEvents(summaries, sortBy) {
    const comparators = {
        date: (left, right) => compareValues(dateSortKey(left) ?? "\uffff", dateSortKey(right) ?? "\uffff"),
        price: (left, right) => compareValues(
            cheapestPrice(left) ?? Infinity,
            cheapestPrice(right) ?? Infinity
        ),
        availability: (left, right) => compareValues(
            availableSeats(right),
            availableSeats(left)
        )
    };
    const comparePrimary = comparators[sortBy];

    if (!comparePrimary) {
        throw new DomainError("Unknown event sort option", "VALIDATION");
    }

    return mergeSort(summaries, (left, right) =>
        comparePrimary(left, right) || compareTitleAndId(left, right)
    );
}

export function searchEvents(summaries, criteria, sortBy) {
    return sortEvents(filterEvents(summaries, criteria), sortBy);
}