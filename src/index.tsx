import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { filter, Observable, Subject } from "rxjs";
import "./index.css";

type AppEventType = "click" | "move";

type AppEvent = {
  event: AppEventType;
  date: Date;
};

function createEventStuff() {
  const eventSubject = new Subject<AppEvent>();
  const eventObservable = eventSubject.asObservable();
  function emit(event: AppEventType) {
    eventSubject.next({ event, date: new Date() });
  }
  return { eventSubject, eventObservable, emit };
}

type EventContextValue = {
  eventSubject: Subject<AppEvent>;
  eventObservable: Observable<AppEvent>;
  emit: (event: AppEventType) => void;
};

const EventContext = createContext<EventContextValue>(createEventStuff());

type EventProviderProps = {
  children: ReactNode;
};

function EventProvider({ children }: EventProviderProps) {
  const [eventStuff] = useState(() => createEventStuff());

  return (
    <EventContext.Provider value={eventStuff}>{children}</EventContext.Provider>
  );
}

function useEvents() {
  return useContext(EventContext);
}

function useObservableCallback<T>(o: Observable<T>, cb: () => void) {
  useLayoutEffect(() => {
    const subscription = o.subscribe({
      next: cb,
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cb, o]);
}

function useClickEvents(callback: () => void) {
  const { eventObservable } = useEvents();

  const clickEvents = useMemo(
    () => eventObservable.pipe(filter((e) => e.event === "click")),
    [eventObservable]
  );

  useObservableCallback(clickEvents, callback);
}

function Debug() {
  const { eventObservable } = useEvents();
  const [events, setEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    const subscription = eventObservable.subscribe((newEvent) => {
      setEvents((currentEvents) => {
        return [...currentEvents, newEvent].slice(-100);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [eventObservable]);

  return (
    <div className="debug">
      <pre>
        <code>
          {JSON.stringify(
            [...events]
              .map(({ event, date }) => `[${date.valueOf()}] ${event}`)
              .reverse(),
            null,
            2
          )}
        </code>
      </pre>
    </div>
  );
}

function JustClickEvents() {
  const [count, setCount] = useState(0);

  const onClick = useCallback(() => {
    setCount((currentCount) => currentCount + 1);
  }, []);

  useClickEvents(onClick);

  return <div className="click-events">Number of Click Events: {count}</div>;
}

function App() {
  const { emit } = useEvents();
  return (
    <div className="container">
      <div
        onClick={() => {
          emit("click");
        }}
        onMouseMove={() => {
          emit("move");
        }}
        className="interactive-area"
      ></div>
      <Debug />
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const reactRoot = createRoot(rootElement);
  reactRoot.render(
    <EventProvider>
      <App />
      <JustClickEvents />
    </EventProvider>
  );
}
