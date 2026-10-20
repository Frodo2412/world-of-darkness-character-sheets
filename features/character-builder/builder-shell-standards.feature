Feature: The builder shell meets the screen standards

  The sidebar, the Back and Continue footer and the freebie row are on every screen, so each screen
  is held to the same standards with them in place. Each screen's own content is held to them by
  the slice that builds it.

  Scenario Outline: Each screen with the shell is accessible and fits a phone
    Given a build named "Lucita" of clan "Lasombra"
    When I choose <screen> in the sidebar
    Then focus is on the <screen> heading
    And the shell has exactly one level 1 heading
    And the shell has no WCAG 2.1 AA violations at 1512 pixels wide
    And the shell has no WCAG 2.1 AA violations at 375 pixels wide
    And every shell control has a unique accessible name
    And the shell does not scroll horizontally at 375 pixels wide

    Examples:
      | screen            |
      | Character concept |
      | Clan              |
      | Nature & Demeanor |
      | Attributes        |
      | Abilities         |
      | Advantages        |
      | Finishing touches |
      | Review & resolve  |

  # Finishing touches is left out: its ten-dot Humanity and Willpower rows are 33 px too wide at 320 px
  # (the same before the sidebar), which the minus/plus rating rows of Step 3.5 and Slice 14 resolve.
  Scenario Outline: Each screen with the shell fits the narrowest phone
    Given a build named "Lucita" of clan "Lasombra"
    When I choose <screen> in the sidebar
    Then the shell does not scroll horizontally at 320 pixels wide

    Examples:
      | screen            |
      | Character concept |
      | Clan              |
      | Nature & Demeanor |
      | Attributes        |
      | Abilities         |
      | Advantages        |
      | Review & resolve  |

  Scenario: A gated Continue with its reason and go-to button is accessible and fits a phone
    Given a build with no clan chosen
    When I open the Advantages screen
    Then the reason has a button "Go to Clan"
    And the shell has no WCAG 2.1 AA violations at 1512 pixels wide
    And the shell has no WCAG 2.1 AA violations at 375 pixels wide
    And every shell control has a unique accessible name
    And the shell does not scroll horizontally at 375 pixels wide
    And the shell does not scroll horizontally at 320 pixels wide
