Feature: Sort order

  Background:
    Given these characters and builds, created in this order
      | kind      | name    | clan     | chronicle |
      | character | Lucita  | Lasombra | Milan     |
      | build     | Beckett | Gangrel  |           |
      | character | anatole |          |           |
      | character | Élodie  | brujah   |           |
      | character | Zed     | Brujah   |           |

  @pending
  Scenario: The newest entry is first to begin with
    When the player opens the roster
    Then "Newest first" is the chosen sort order
    And the roster lists "Zed", "Élodie", "anatole", "Beckett", "Lucita" in that order

  @pending
  Scenario Outline: The player chooses the order
    When the player opens the roster
    And they sort by "<order>"
    Then the roster lists <names> in that order

    Examples:
      | order        | names                                            |
      | Oldest first | "Lucita", "Beckett", "anatole", "Élodie", "Zed"  |
      | Name A–Z     | "anatole", "Beckett", "Élodie", "Lucita", "Zed"  |
      | Clan A–Z     | "Élodie", "Zed", "Beckett", "Lucita", "anatole"  |

  @pending
  Scenario Outline: Whatever was just started is first
    When the player chooses "<action>" and returns to the roster
    Then the first entry is "<name>"

    Examples:
      | action                   | name              |
      | Start with a blank sheet | Unnamed character |
      | Start character creator  | Unnamed build     |

  @pending
  Scenario Outline: Where an unreadable record is listed
    Given a character saved after the others whose data has been damaged
    When the player opens the roster
    And they sort by "<order>"
    Then the unreadable character is <position>

    Examples:
      | order        | position |
      | Newest first | first    |
      | Oldest first | last     |
      | Name A–Z     | last     |
      | Clan A–Z     | last     |

  @pending
  Scenario: Sorting keeps the filters
    When the player opens the roster
    And they search for "an"
    And they sort by "Name A–Z"
    Then the search field holds "an"
    And the roster lists "anatole", "Beckett" in that order

  @pending
  Scenario: Clearing filters keeps the sort order
    When the player opens the roster
    And they sort by "Name A–Z"
    And they search for "zzz"
    And they choose "Clear filters"
    Then "Name A–Z" is the chosen sort order

  @pending
  Scenario: A sort change is announced
    When the player opens the roster
    And they sort by "Name A–Z"
    Then "Sorted by Name A–Z." is announced once
    And focus is still on the sort control

  @pending
  Scenario: Reloading resets every filter
    When the player opens the roster
    And they select the tab "Milan · 1"
    And they choose the clan "Lasombra"
    And they choose "Ready to play"
    And they search for "luc"
    And they sort by "Name A–Z"
    And they reload the page
    Then "All characters · 5" is the selected tab
    And the search field is empty, "All clans" is chosen and "All" is the selected status
    And "Newest first" is the chosen sort order
    And the roster lists 5 entries

  @pending
  Scenario: Using every control leaves what is stored untouched
    Given a saved character whose data has been damaged
    When the player opens the roster
    And they select each tab, search, choose a clan, choose each status, choose each sort order and clear the filters
    Then every stored record is exactly as it was
