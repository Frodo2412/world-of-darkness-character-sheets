Feature: Search

  Background:
    Given these characters and builds, created in this order
      | kind      | name           | clan     | concept     | player | chronicle      |
      | character | Éloïse Voss    | Toreador | Antiquarian | Ana    | The Glass City |
      | character | Gabriel Ash    | Ventrue  | Fixer       | Bruno  | The Glass City |
      | character | Mara Delacroix | Brujah   | Agitator    | Ana    |                |
      | build     | Silas Reed     | brujah   | Broker      |        | The Glass City |

  Scenario Outline: Search finds by name, clan or concept, ignoring case and accents
    When the player opens the roster
    And they search for "<text>"
    Then the roster lists only "<found>"

    Examples:
      | text    | found          |
      | eloise  | Éloïse Voss    |
      | VENTRUE | Gabriel Ash    |
      | agitat  | Mara Delacroix |

  Scenario: The list narrows while typing and returns when cleared
    When the player opens the roster
    And they type "g", then "a", in the search field
    Then the roster lists only "Gabriel Ash"
    When they clear the search field
    Then the roster lists 4 entries

  Scenario Outline: Search does not look at the player or the chronicle
    When the player opens the roster
    And they search for "<text>"
    Then the roster shows "No characters match."

    Examples:
      | text  |
      | Ana   |
      | Glass |

  Scenario: A search of only spaces matches everything
    When the player opens the roster
    And they search for "   "
    Then the roster lists 4 entries

  Scenario: Search works within the selected tab
    When the player opens the roster
    And they select the tab "The Glass City · 3"
    And they search for "x"
    Then the roster lists only "Gabriel Ash"
    And the summary row reads "Showing 1 of 4 characters"

  Scenario: Tab counts do not change while searching
    When the player opens the roster
    And they search for "eloise"
    Then the tabs are "All characters · 4", "The Glass City · 3", "Unassigned · 1"

  Scenario: An unreadable record is left out while searching
    Given a saved character whose data has become unreadable
    When the player opens the roster
    And they search for "e"
    Then the roster lists no unreadable character
    When they clear the search field
    Then the roster lists one unreadable character

  Scenario Outline: The summary row counts what is shown
    When the player opens the roster
    And they search for "<text>"
    Then the summary row reads "<summary>"

    Examples:
      | text   | summary                   |
      | eloise | Showing 1 of 4 characters |
      | e      | Showing 4 of 4 characters |
      | zzz    | Showing 0 of 4 characters |

  Scenario: Clearing a search that matched nothing
    When the player opens the roster
    And they select the tab "The Glass City · 3"
    And they search for "zzz"
    Then the roster shows "No characters match." and offers "Clear filters"
    When they choose "Clear filters"
    Then the roster lists 3 entries
    And "The Glass City · 3" is the selected tab
    And the search field is empty and has focus

  Scenario: Nothing is announced until the player filters
    When the player opens the roster
    Then nothing has been announced

  Scenario Outline: A change is announced once the player pauses, without moving focus
    When the player opens the roster
    And they <change>
    Then the roster announces "<announcement>" once
    And focus is still on <control>

    Examples:
      | change                                | announcement                                    | control          |
      | type "eloise" in the search field     | Showing 1 of 4 characters                       | the search field |
      | type "zzz" in the search field        | No characters match. Showing 0 of 4 characters  | the search field |
      | select the tab "The Glass City · 3"   | Showing 3 of 4 characters                       | that tab         |

  Scenario: Clearing the filters is announced
    When the player opens the roster
    And they search for "zzz", pause, and then choose "Clear filters"
    Then "Showing 4 of 4 characters" is the last announcement

  Scenario: The same count is announced again
    When the player opens the roster
    And they search for "eloise", pause, and then search for "gabriel"
    Then "Showing 1 of 4 characters" has been announced twice

  Scenario Outline: The keyboard shortcut focuses search
    Given the browser reports the platform "<platform>"
    When the player opens the roster
    And they press "<keys>"
    Then focus <outcome> the search field
    And the hint beside the search field reads "<hint>"

    Examples:
      | platform | keys      | outcome   | hint   |
      | MacIntel | Meta+K    | is in     | ⌘ K    |
      | MacIntel | Control+K | is not in | ⌘ K    |
      | Win32    | Control+K | is in     | Ctrl K |
      | Win32    | Meta+K    | is not in | Ctrl K |

  Scenario: The search field is named for what it does
    When the player opens the roster
    Then the search field's accessible name is "Search characters"
    And its placeholder reads "Search by name, clan, or concept…"
