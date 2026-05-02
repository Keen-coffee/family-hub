declare module 'ical.js' {
  export class Component {
    constructor(jCal: unknown);
    getAllSubcomponents(name: string): Component[];
    getFirstSubcomponent(name: string): Component | null;
    getFirstPropertyValue(name: string): string | null;
    getFirstProperty(name: string): Property | null;
  }
  export class Property {
    getFirstValue(): unknown;
    getValues(): unknown[];
  }
  export class Time {
    isDate: boolean;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    zone: unknown;
    toJSDate(): Date;
    toString(): string;
  }
  export class Event {
    constructor(comp: Component | null);
    summary: string;
    description: string;
    location: string;
    uid: string;
    startDate: Time;
    endDate: Time;
    isRecurring(): boolean;
  }
  export function parse(ics: string): unknown;
  export default { parse, Component, Property, Time, Event };
}
