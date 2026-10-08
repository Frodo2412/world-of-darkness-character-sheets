Feature: Library layout and accessibility

  Scenario Outline: The creator sits beside the library on wide screens
    Given a full library
    When the roster is shown <width> pixels wide
    Then the Character creator card is to the right of the list
    And its creation stages and both create actions are visible
    And the page does not scroll horizontally

    Examples:
      | width |
      | 1200  |
      | 1512  |

  Scenario: The page holds the frame's width
    Given a full library
    When the roster is shown 1920 pixels wide
    Then the page content is no wider than 1512 pixels

  Scenario Outline: The creator moves above the library on narrower screens
    Given a full library
    When the roster is shown <width> pixels wide
    Then the Character creator card is above the list
    And its creation stages are not shown
    And both create actions are visible

    Examples:
      | width |
      | 1199  |
      | 768   |
      | 320   |

  Scenario: The library is usable on a small phone
    Given a full library
    When the roster is shown 320 pixels wide
    Then the page does not scroll horizontally
    And every entry's name and actions lie within the screen's width and are not cut off
    And every character's and build's summary line lies within the screen's width

  Scenario: Long names do not break a narrow screen
    Given a saved character whose name and chronicle are each 60 letters with no space
    When the roster is shown 320 pixels wide
    Then the page does not scroll horizontally
    And the entry's whole name and whole chronicle can be read, wrapped onto more lines if need be
    And the chronicle's tab has its full name as its accessible name

  Scenario: Many chronicles scroll within the tab strip
    Given a full library and characters in eight more chronicles
    When the roster is shown 320 pixels wide
    Then the page does not scroll horizontally
    And pressing End on the tabs brings the last tab fully into view

  @pending
  Scenario Outline: Focus moves through the page in reading order
    Given a full library
    When the roster is shown <width> pixels wide
    And the player tabs from the top of the page to the bottom
    Then after the application title, focus visits the selected tab, both create actions, search, the clan filter, the status filter, the sort control and each entry's actions, in that order
    And every focused control shows an outline at least 2 pixels thick

    Examples:
      | width |
      | 1512  |
      | 320   |

  @pending
  Scenario: The library is worked without a pointer
    Given a full library
    When the player, using only the keyboard, moves to the tab "The Glass City · 2"
    Then the roster lists only "Lucita" and "Fatima"
    When they type "zzz" in the search field and activate "Clear filters" with the Enter key
    Then the roster shows "No characters match." and then lists "Lucita" and "Fatima" again
    When they choose "Ready to play" and the sort order "Name A–Z" with the arrow keys
    Then "Ready to play" is the selected status and the first entry is "Fatima"
    When they activate "Open sheet" for "Fatima" with the Enter key
    Then the sheet for "Fatima" is shown in play mode

  @pending
  Scenario Outline: The library has no accessibility violations
    Given the library is in the "<state>" state
    When the roster is checked
    Then no WCAG 2.1 AA violations are reported

    Examples:
      | state               |
      | full                |
      | no match            |
      | empty               |
      | storage unavailable |
      | create refused      |

  @pending
  Scenario: Every control has its own name
    Given a full library and two more characters with nothing filled in
    When the player opens the roster
    Then every control has a unique, non-empty accessible name
    And the two unnamed characters' actions name "Unnamed character" and "Unnamed character 2"

  @pending
  Scenario Outline: Controls are large enough to press
    Given a full library
    When the roster is shown <width> pixels wide
    Then every tab, field, select, status option, entry action and create action is at least 24 pixels wide and 24 pixels tall

    Examples:
      | width |
      | 320   |
      | 768   |
      | 1512  |

  @pending
  Scenario: The page is outlined by its headings
    Given a full library
    When the player opens the roster
    Then the only level 1 heading is "Characters"
    And the level 2 headings are "A new story begins." and "Library"
    And every entry's name is a level 3 heading

  @pending
  Scenario: Selection does not rest on colour alone
    Given a full library
    When the roster is shown with forced colours
    Then the selected tab is underlined and no other tab is
    And the selected status is outlined and the other is not
