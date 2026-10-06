Feature: Play view layout and accessibility

  Scenario: The wide layout follows the design
    Given a player viewing a saved character's sheet on a 1512 pixel wide screen
    Then the application bar, character identity, live resources and workspace appear in that order from the top
    And Blood Pool, Willpower, Health and Humanity sit side by side in one row
    And Selected pool, Disciplines and Virtues are stacked in a column to the right of the traits
    And the application bar is 56 pixels high, the identity 76 pixels high, the right column 320 pixels wide and a trait row 33 pixels high

  Scenario: The narrow layout stacks in reading order
    Given a player viewing a saved character's sheet on a 320 pixel wide screen
    Then the page is no wider than the screen
    And every card's box lies within the screen width
    And the cards come in the order Blood Pool, Willpower, Health, Humanity, Selected pool, Attributes, Abilities, Disciplines, Virtues
    And the health levels are listed one per line

  Scenario Outline: The sheet fits in both modes at common widths
    Given a player viewing a saved character's sheet in <mode> mode on a <width> pixel wide screen
    Then the page is no wider than the screen
    And no text on the sheet is wider than the element that holds it

    Examples:
      | mode | width |
      | play | 320   |
      | edit | 320   |
      | play | 768   |
      | edit | 768   |

  Scenario: Controls are large enough to touch on a narrow screen
    Given a player viewing a saved character's sheet on a 320 pixel wide screen
    Then every stepper button, health box and selectable row is at least 44 pixels high

  Scenario Outline: No automated accessibility violations in the play view
    Given a player viewing the <page>
    When the page is checked against WCAG 2.1 AA
    Then no violations are reported

    Examples:
      | page                                    |
      | sheet in play mode with a pool selected |
      | sheet in edit mode                      |
      | sheet of a wounded character over its blood maximum |

  Scenario: A session can be played from the keyboard
    Given a saved character with generation "10th", 8 blood, Intelligence 4 and Investigation 3
    And the player has that character's sheet open in play mode
    When they use only the keyboard to spend one blood, mark bashing damage on Bruised and select Intelligence and Investigation
    Then the Blood Pool reads "7 / 13", Bruised shows bashing damage and the dice total is "7 dice"
    And keyboard focus was visible at every stop

  Scenario: A character can be edited from the keyboard
    Given the player has a saved character's sheet open in play mode
    When they use only the keyboard to enter edit mode, enter a Name, set Strength to 3 and leave edit mode
    Then the identity shows that name and Strength is rated 3
    And keyboard focus was visible at every stop

  Scenario Outline: Every control has a unique name
    Given a player viewing a saved character's sheet in <mode> mode
    Then every button, text field, rating and health box that is offered has an accessible name unique within the sheet

    Examples:
      | mode |
      | play |
      | edit |

  Scenario: Edit-only controls are out of reach in play mode
    Given the player has a saved character's sheet open in play mode
    When they press the Tab key until focus has gone round the whole page once
    Then keyboard focus never landed on a text field or an editable rating
