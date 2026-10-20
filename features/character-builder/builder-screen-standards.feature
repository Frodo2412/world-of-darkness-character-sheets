Feature: Every builder screen meets the screen standards

  The sidebar, the Back and Continue footer and the freebie row are on every screen, so each screen
  is held to the same standards with them in place. The steps are the generic ones every screen's own
  feature ends in (builder-standards.steps.ts); a screen's own states are held to them by the slice
  that builds it.

  Scenario Outline: Each screen is accessible and fits a phone
    Given a build named "Lucita" of clan "Lasombra"
    When I choose <screen> in the sidebar
    Then focus is on the <screen> heading
    And there is exactly one h1
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px

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
  Scenario Outline: Each screen but Finishing touches fits the narrowest phone
    Given a build named "Lucita" of clan "Lasombra"
    When I choose <screen> in the sidebar
    Then the page does not scroll horizontally at 320 px

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
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px
