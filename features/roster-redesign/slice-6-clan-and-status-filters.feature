Feature: Clan and status filters

  Background:
    Given these characters and builds, created in this order
      | kind      | name           | clan     | concept     | chronicle      |
      | character | Éloïse Voss    | Toreador | Antiquarian | The Glass City |
      | character | Gabriel Ash    | Ventrue  | Fixer       | The Glass City |
      | character | Mara Delacroix | Brujah   | Agitator    |                |
      | build     | Silas Reed     | Brujah   | Broker      | The Glass City |

  @pending
  Scenario: The clan filter offers the clans present
    When the player opens the roster
    Then the clan filter offers "All clans", "Brujah", "Toreador", "Ventrue" in that order
    And "All clans" is chosen

  @pending
  Scenario: Choosing a clan lists only that clan
    When the player opens the roster
    And they choose the clan "Brujah"
    Then the roster lists "Mara Delacroix" and "Silas Reed" and nothing else

  @pending
  Scenario: Ready to play leaves builds out
    When the player opens the roster
    Then the status filter reads "All · 4" and "Ready to play · 3"
    And "All" is the selected status
    When they choose "Ready to play"
    Then the roster lists 3 entries and "Silas Reed" is not among them
    And "Ready to play" is the selected status

  @pending
  Scenario: Status counts follow the selected tab
    When the player opens the roster
    And they select the tab "The Glass City · 3"
    Then the status filter reads "All · 3" and "Ready to play · 2"

  @pending
  Scenario: Status and tab counts ignore the other filters
    When the player opens the roster
    And they search for "eloise"
    And they choose the clan "Toreador"
    And they choose "Ready to play"
    Then the status filter reads "All · 4" and "Ready to play · 3"
    And the tabs are "All characters · 4", "The Glass City · 3", "Unassigned · 1"

  @pending
  Scenario Outline: Filters combine
    When the player opens the roster
    And they select the tab "<tab>"
    And they choose the clan "<clan>"
    And they choose "<status>"
    And they search for "<search>"
    Then the roster lists <listed>

    Examples:
      | tab                | clan      | status        | search | listed                |
      | The Glass City · 3 | Brujah    | All           |        | only "Silas Reed"     |
      | The Glass City · 3 | Brujah    | Ready to play |        | nothing               |
      | All characters · 4 | Brujah    | Ready to play |        | only "Mara Delacroix" |
      | The Glass City · 3 | All clans | Ready to play | gab    | only "Gabriel Ash"    |

  @pending
  Scenario: Clear filters resets search, clan and status and keeps the tab
    When the player opens the roster
    And they select the tab "The Glass City · 3"
    And they choose the clan "Brujah"
    And they choose "Ready to play"
    And they search for "zzz"
    And they choose "Clear filters"
    Then the roster lists 3 entries
    And "The Glass City · 3" is the selected tab
    And the search field is empty, "All clans" is chosen and "All" is the selected status
    And the search field has focus

  @pending
  Scenario Outline: An unreadable record shows only on the unfiltered list
    Given a saved character whose data has been damaged
    When the player opens the roster
    And they <narrow>
    Then the roster lists <unreadable>

    Examples:
      | narrow                              | unreadable                |
      | change nothing                      | one unreadable character  |
      | choose the clan "Toreador"          | no unreadable character   |
      | choose "Ready to play"              | no unreadable character   |

  @pending
  Scenario Outline: A clan or status change is announced without moving focus
    When the player opens the roster
    And they <change>
    Then "<announcement>" is announced once
    And focus is still on <control>

    Examples:
      | change                    | announcement               | control          |
      | choose the clan "Brujah"  | Showing 2 of 4 characters  | the clan filter  |
      | choose "Ready to play"    | Showing 3 of 4 characters  | "Ready to play"  |

  @pending
  Scenario: The status filter is worked from the keyboard
    When the player opens the roster
    And they focus the selected status and press the right arrow key
    Then "Ready to play" is the selected status and has focus
    When they press "Tab"
    Then focus has left the status filter
