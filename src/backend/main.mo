import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

actor {
  type Session = {
    date : Time.Time;
    duration : Nat;
  };

  let sessions = Map.empty<Principal, List.List<Session>>();

  // Add a new meditation session
  public shared ({ caller }) func addSession(duration : Nat) : async () {
    let session : Session = {
      date = Time.now();
      duration;
    };

    let currentSessions = switch (sessions.get(caller)) {
      case (null) {
        let newList = List.empty<Session>();
        sessions.add(caller, newList);
        newList;
      };
      case (?list) { list };
    };

    currentSessions.add(session);
  };

  // Get all sessions for the caller
  public query ({ caller }) func getSessions() : async [Session] {
    switch (sessions.get(caller)) {
      case (null) { [] };
      case (?sessions) { sessions.toArray() };
    };
  };

  // Get all sessions for a specific user (admin only)
  public query ({ caller }) func getUserSessions(user : Principal) : async [Session] {
    switch (sessions.get(user)) {
      case (null) { Runtime.trap("No such user") };
      case (?sessions) { sessions.toArray() };
    };
  };

  // Get all meditation data (admin only)
  public query ({ caller }) func getAllSessions() : async [(Principal, [Session])] {
    let result = List.empty<(Principal, [Session])>();
    for ((user, sessions) in sessions.entries()) {
      result.add((user, sessions.toArray()));
    };
    result.toArray();
  };
};
