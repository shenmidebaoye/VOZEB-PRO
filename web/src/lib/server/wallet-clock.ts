import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export type WalletClockInput = {
    now?: Date;
    timeZone?: string;
};

export type WalletClock = {
    now: Date;
    date: string;
    expiresAt: string;
    timeZone: string;
};

export function walletClock(input: WalletClockInput = {}): WalletClock {
    const now = input.now || new Date();
    const timeZone = validTimeZone(input.timeZone || process.env.VOZEB_PRO_TIME_ZONE || DEFAULT_TIME_ZONE);
    const zoned = dayjs(now).tz(timeZone);
    return {
        now,
        date: zoned.format("YYYY-MM-DD"),
        expiresAt: zoned.endOf("day").toISOString(),
        timeZone,
    };
}

function validTimeZone(value: string) {
    try {
        Intl.DateTimeFormat("en-US", { timeZone: value });
        return value;
    } catch {
        return DEFAULT_TIME_ZONE;
    }
}
