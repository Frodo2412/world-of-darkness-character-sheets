Feature: Chronicle tabs

  @pending
  Scenario: Without chronicles there is one tab
    Given saved characters "Lucita" and "Fatima" with no chronicle
    When the player opens the roster
    Then the only tab is "All characters · 2"
    And the summary row shows no chronicle breakdown

  @pending
  Scenario: Each chronicle has a tab
    Given saved characters in these chronicles
      | name    | chronicle      |
      | Lucita  | The Glass City |
      | Fatima  | The Glass City |
      | Anatole | Ashes of Milan |
      | Beckett |                |
    When the player opens the roster
    Then the tabs are "All characters · 4", "Ashes of Milan · 1", "The Glass City · 2", "Unassigned · 1"
    And "All characters · 4" is the selected tab
    And the list region is named by the selected tab

  @pending
  Scenario: Unassigned is left out when every entry has a chronicle
    Given saved characters "Lucita" and "Fatima" in the chronicle "The Glass City"
    When the player opens the roster
    Then the tabs are "All characters · 2", "The Glass City · 2"

  @pending
  Scenario Outline: One chronicle however it is spelled, shown as its oldest entry spells it
    Given saved characters, oldest first, in the chronicles <spellings>
    When the player opens the roster
    Then the tabs are "All characters · <count>", "<tab>"

    Examples:
      | spellings                                               | count | tab                |
      | "The Glass City", " the glass city ", "THE GLASS CITY"  | 3     | The Glass City · 3 |
      | " the glass city ", "The Glass City"                    | 2     | the glass city · 2 |

  @pending
  Scenario: A tab lists only its chronicle
    Given saved characters "Lucita" in "The Glass City" and "Anatole" in "Ashes of Milan"
    When the player opens the roster
    And they select the tab "Ashes of Milan · 1"
    Then the roster lists only "Anatole"
    And "Ashes of Milan · 1" is the selected tab
    And the list region is named by the selected tab
    And the summary row reads "Showing 1 of 2 characters"

  @pending
  Scenario: Builds and unreadable records are counted
    Given a saved character "Lucita" in the chronicle "The Glass City"
    And a build in progress named "Beckett" in the chronicle "The Glass City"
    And a saved character whose data has been damaged
    When the player opens the roster
    Then the tabs are "All characters · 3", "The Glass City · 2", "Unassigned · 1"

  @pending
  Scenario: Unassigned lists what has no chronicle
    Given a saved character "Lucita" in the chronicle "The Glass City"
    And a saved character "Beckett" with no chronicle
    And a saved character whose data has been damaged
    When the player opens the roster
    And they select the tab "Unassigned · 2"
    Then the roster lists "Beckett" and one unreadable character and nothing else

  @pending
  Scenario: A chronicle tab leaves unreadable records out
    Given a saved character "Lucita" in the chronicle "The Glass City"
    And a saved character whose data has been damaged
    When the player opens the roster
    And they select the tab "The Glass City · 1"
    Then the roster lists only "Lucita"

  @pending
  Scenario: A chronicle given on the sheet moves the character to its tab
    Given a saved character named "Lucita" with chronicle "The Glass City"
    And a saved character named "Fatima" with no chronicle
    When the player edits "Fatima" and enters the chronicle "The Glass City"
    And they open the roster
    Then the tabs are "All characters · 2", "The Glass City · 2"

  @pending
  Scenario: A restored page starts again from all characters
    Given saved characters "Lucita" in "The Glass City" and "Anatole" in "Ashes of Milan"
    And the player has selected the tab "Ashes of Milan · 1" on the roster
    And the chronicle of "Anatole" is cleared from another page
    When the roster is restored from the browser's back and forward cache
    Then the tabs are "All characters · 2", "The Glass City · 1", "Unassigned · 1"
    And "All characters · 2" is the selected tab
    And the roster lists 2 entries

  @pending
  Scenario Outline: Tabs are worked with the arrow, Home and End keys
    Given saved characters "Lucita" in "The Glass City" and "Anatole" in "Ashes of Milan"
    And the player has opened the roster and focused the tab "<from>"
    When they press "<key>"
    Then "<to>" is the selected tab and has focus
    And the roster lists <listed>

    Examples:
      | from               | key        | to                 | listed         |
      | All characters · 2 | ArrowRight | Ashes of Milan · 1 | only "Anatole" |
      | All characters · 2 | ArrowLeft  | The Glass City · 1 | only "Lucita"  |
      | All characters · 2 | End        | The Glass City · 1 | only "Lucita"  |
      | The Glass City · 1 | ArrowRight | All characters · 2 | 2 entries      |
      | The Glass City · 1 | Home       | All characters · 2 | 2 entries      |

  @pending
  Scenario: The tab strip is one stop in the tab order
    Given saved characters "Lucita" in "The Glass City" and "Anatole" in "Ashes of Milan"
    And the player has opened the roster and focused the tab "All characters · 2"
    When they press "Tab"
    Then focus has left the tab strip

  @pending
  Scenario Outline: The summary row describes the chronicles
    Given saved characters whose chronicles are <chronicles>
    When the player opens the roster
    Then the summary row also reads "<breakdown>"

    Examples:
      | chronicles                                                    | breakdown                          |
      | "The Glass City", "The Glass City", none                      | 2 in The Glass City · 1 unassigned |
      | "The Glass City", "Ashes of Milan", "Ashes of Milan", none    | 3 in 2 chronicles · 1 unassigned   |
      | "The Glass City", "The Glass City"                            | 2 in The Glass City                |

  @pending
  Scenario: The chronicle breakdown does not follow the selected tab
    Given saved characters whose chronicles are "The Glass City", "The Glass City", none
    When the player opens the roster
    And they select the tab "Unassigned · 1"
    Then the summary row also reads "2 in The Glass City · 1 unassigned"
