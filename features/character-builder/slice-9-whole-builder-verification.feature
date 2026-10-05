Feature: The builder as a whole

  Scenario: A character is built from start to finish
    Given a player with no saved characters
    When they start building a character
    And they set the base generation to "11th" and the extra freebie points to 5
    And they enter the name "Lucita" and choose the clan "Brujah"
    And they rank the Attribute groups and place all 15 Attribute dots
    And they rank the Ability groups and place all 27 Ability dots
    And they place 3 Discipline dots, 5 Background dots (none on Generation) and 7 Virtue dots
    And they spend all 20 freebie points (none on Generation)
    And they finish the build
    Then the character sheet is shown for "Lucita" of clan "Brujah" and generation "11th"
    And the roster lists one character and no builds in progress

  Scenario: A character is built with the steps taken out of order
    Given a player with no saved characters
    When they start building a character
    And they place 7 Virtue dots and 5 Background dots before anything else
    And they rank the Ability groups and place all 27 Ability dots
    And they rank the Attribute groups and place all 15 Attribute dots
    And they choose the clan "Ventrue" and place 3 Discipline dots
    And they finish the build and accept the confirmation
    Then the character sheet is shown
    And the roster lists one character and no builds in progress

  Scenario: A build survives leaving and coming back
    Given a player who has ranked the Attribute groups, chosen the clan "Gangrel" and bought one freebie dot
    When they go to the roster and continue the build
    Then the ranks, the clan and the freebie points remaining are as they left them

  Scenario Outline: The builder's message and dialog states are accessible
    Given a build showing <state>
    When the page is checked
    Then no WCAG 2.1 AA violations are reported
    And at 375 pixels wide the page does not scroll horizontally

    Examples:
      | state                                        |
      | a refusal beside a group                     |
      | a rejected number entry                      |
      | the not-saved message                        |
      | the clan-change confirmation                 |
      | a clan-change notice                         |
      | the outstanding list with items              |
      | the unspent-freebies confirmation            |
      | the build not found message                  |
      | the unreadable build message                 |
      | a locked Appearance for a Nosferatu          |
      | ratings of 9 dots at 4th generation          |

  Scenario Outline: Each step can be used with the keyboard alone
    Given a build in progress of clan "Caitiff"
    When using only the keyboard they <action>
    Then <outcome>
    And every control they stopped on showed a visible focus indicator

    Examples:
      | action                                               | outcome                                  |
      | set the base generation to "10th"                    | the base generation is "10th"            |
      | choose the clan "Brujah"                             | the chosen clan is "Brujah"              |
      | rank Physical primary and raise Strength to 3        | Strength is rated 3                      |
      | rank Talents primary and raise Brawl to 2            | Brawl is rated 2                         |
      | add the Discipline "Protean" and raise it to 1       | Protean is rated 1                       |
      | buy one dot of Willpower with freebie points         | there are 14 freebie points remaining    |
      | move from Settings to Advantages with the navigation | the "Advantages" step is shown           |

  Scenario: The finish confirmation works from the keyboard
    Given a complete build with 4 freebie points remaining
    When using only the keyboard they activate Finish and press Escape
    Then the builder is still shown with keyboard focus on the Finish button

  Scenario Outline: Remaining amounts are announced when they change
    Given <build>
    When they <change>
    Then "<announcement>" is announced once

    Examples:
      | build                                             | change                                       | announcement                    |
      | a player who has ranked Physical primary          | raise Strength to 3                          | Physical: 5 dots remaining      |
      | a build of clan "Brujah"                          | raise Celerity to 1                          | Disciplines: 2 dots remaining   |
      | a complete build with 15 freebie points remaining | buy one dot of Willpower with freebie points | 14 freebie points remaining     |

  Scenario: A rating reports its name and value
    Given a 13th generation build with Physical ranked primary and Strength rated 3
    When Strength is read by assistive technology on the attributes step
    Then it is announced as "Strength", value 3, lowest 1, highest 5

  Scenario: A refusal is announced as text beside what was refused
    Given a player who has ranked Mental tertiary and placed all 3 Mental dots
    When they try to raise Wits by 1
    Then the refusal text is announced once
    And the refusal text is shown inside the Mental group
    And Wits is described by that refusal text

  Scenario: Repeating a refused action does not repeat the announcement
    Given a player who was just told Mental has no dots remaining
    When they try to raise Wits by 1 again
    Then nothing new is announced
